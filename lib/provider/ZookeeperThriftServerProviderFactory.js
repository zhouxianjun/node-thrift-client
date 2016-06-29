/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/4/29
 * Time: 15:54
 *                 _ooOoo_
 *                o8888888o
 *                88" . "88
 *                (| -_- |)
 *                O\  =  /O
 *             ____/`---'\____
 *           .'  \\|     |//  `.
 *           /  \\|||  :  |||//  \
 *           /  _||||| -:- |||||-  \
 *           |   | \\\  -  /// |   |
 *           | \_|  ''\---/''  |   |
 *           \  .-\__  `-`  ___/-. /
 *         ___`. .'  /--.--\  `. . __
 *      ."" '<  `.___\_<|>_/___.'  >'"".
 *     | | :  `- \`.;`\ _ /`;.`/ - ` : | |
 *     \  \ `-.   \_ __\ /__ _/   .-` /  /
 *======`-.____`-.___\_____/___.-`____.-'======
 *                   `=---='
 *^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *           佛祖保佑       永无BUG
 */
'use strict';
const merge = require('merge');
const ThriftServerProviderFactory = require('./ThriftServerProviderFactory');
const logger = require('../util/LogUtils').log();
const RPC = 'rpc';
function listChildren(root, callback) {
    console.log(`### ${root}`);
    this.$prop.zk.getChildren(
        root,
        event => Reflect.apply(listChildren, this, [root, callback]),
        (error, children, stat) => {
            if (error) {
                logger.error('children:%s listener error.', root, error);
                return;
            }
            //TODO 销毁之前的服务端 目前全部销毁重新订阅
            this.$prop.address.clear();
            if (!children || children.length <= 0 && this.$prop.cache.size > 0) {
                for (let [key, value] of this.$prop.cache) {
                    for (let invoker of value.values()) {
                        logger.info("zookeeper unsubscribe %s-%s", Symbol.keyFor(key), invoker.address);
                        invoker.destroy();
                    }
                    this.$prop.cache.delete(key);
                }
                return;
            }
            //this.$prop.cache.clear();
            children.forEach(p => {
                let val = `${root}/${p}`;
                this.$prop.zk.getChildren(val, (err, child) => {
                    if (!child || child.length <= 0) {
                        callback && callback(val);
                        return;
                    }
                    Reflect.apply(listChildren, this, [val, callback]);
                });
            });
        }
    );
}
module.exports = class ZookeeperThriftServerProviderFactory extends ThriftServerProviderFactory {
    constructor(zookeeper, invokerFactory, root = 'thrift') {
        super();
        this.$prop = merge(this.$prop || {}, {
            zk: null,
            invokerFactory: null,
            root: null,
            cache: new Map(),
            address: new Map(),
            isInit: false
        });
        this.$prop.zk = zookeeper;
        this.$prop.root = root;
        this.$prop.invokerFactory = invokerFactory;
        //监听字节点,最底层触发callback
        Reflect.apply(listChildren, this, [`/${RPC}/${root}`, p => {
            logger.log(`listener path: ${p}`);
            let array = p.split('/');
            if (array.length == 6) {
                let keySymbol = Symbol.for(`${array[3]}:${array[4]}`);
                logger.info("zookeeper subscribe %s-%s", Symbol.keyFor(keySymbol), array[5]);
                if (!this.$prop.address.has(keySymbol))
                    this.$prop.address.set(keySymbol, new Set());
                this.$prop.address.get(keySymbol).add(array[5]);
            }

            //销毁不存在的服务
            for (let [key, value] of this.$prop.cache) {
                if (!this.$prop.address.has(key)) {
                    for (let invoker of value.values()){
                        logger.info("zookeeper unsubscribe %s-%s", Symbol.keyFor(key), invoker.address);
                        invoker.destroy();
                    }
                    this.$prop.cache.delete(key);
                    continue;
                }
                //销毁不存在的地址
                let addressList = this.$prop.address.get(key);
                for (let invoker of value.values()){
                    let available = invoker.isAvailable();
                    for (let address of addressList.values()) {
                        if (address != invoker.address) {
                            available = false;
                            break;
                        }
                    }
                    if (!available) {
                        logger.info('zookeeper unsubscribe %s-%s', Symbol.keyFor(key), invoker.address);
                        invoker.destroy();
                        value.delete(invoker);
                    }
                }
            }
            if (!this.$prop.isInit) {
                this.$prop.isInit = true;
                this.emit('init');
            }
        }]);
    }
    allServerAddressList(service, version, type) {
        let key = Symbol.for(`${service}:${version}`);
        let addressList = this.$prop.address.get(key);
        if (!addressList) return null;
        if (!this.$prop.cache.has(key)) {
            this.$prop.cache.set(key, new Set());
        }
        let cache = this.$prop.cache.get(key);
        for (let address of addressList.values()) {
            if (!hasForCache(cache, address)) {
                let value = this.$prop.invokerFactory.newInvoker(service, address, type);
                cache.add(value);
            }
        }
        let addresses = cache;
        return addresses == null ? null : new Set(addresses);
    }
    close() {
        try {
            for (let value of this.$prop.cache.values()) {
                for (let invoker of value.values()) {
                    invoker.destroy();
                }
            }
            this.$prop.zk.close();
        } catch (err) {
            logger.error('stop zkClient error', err);
        }
    }
};
function hasForCache(cache, address) {
    for (let invoker of cache.values()) {
        if (invoker.address == address) {
            return true;
        }
    }
    return false;
}