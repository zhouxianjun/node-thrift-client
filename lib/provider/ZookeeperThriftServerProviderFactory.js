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
const ThriftServerProviderFactory = require('./ThriftServerProviderFactory');
const logger = require('../util/LogUtils').log();
const RPC = 'rpc';
const prop = {
    zk: null,
    invokerFactory: null,
    root: null,
    cache: new Map(),
    address: new Map(),
    isInit: false
};
function listChildren(root, callback) {
    prop.zk.getChildren(
        root,
        event => listChildren(root),
        (error, children, stat) => {
            if (error) {
                logger.error('children:%s listener error.', root, error);
                return;
            }
            children.forEach(p => {
                let val = `${root}/${p}`;
                prop.zk.getChildren(val, (err, child) => {
                    if (!child || child.length <= 0) {
                        callback && callback(val);
                        return;
                    }
                    listChildren(val, callback);
                });
            });
        }
    );
}
module.exports = class ZookeeperThriftServerProviderFactory extends ThriftServerProviderFactory {
    constructor(zookeeper, invokerFactory, root = 'thrift') {
        super();
        this.emit = function(a, b) {
            return type => {
                a.emit(type);
                b.emit(type);
            }
        }(this, zookeeper);
        prop.zk = zookeeper;
        prop.root = root;
        prop.invokerFactory = invokerFactory;
        //监听字节点,最底层触发callback
        listChildren(`/${RPC}/${root}`, p => {
            logger.log(`listener path: ${p}`);
            let array = p.split('/');
            if (array.length == 6) {
                let keySymbol = Symbol.for(`${array[3]}:${array[4]}`);
                logger.info("zookeeper subscribe %s-%s", Symbol.keyFor(keySymbol), array[5]);
                if (!prop.address.has(keySymbol))
                    prop.address.set(keySymbol, new Set());
                prop.address.get(keySymbol).add(array[5]);
            }

            //销毁不存在的服务
            for (let [key, value] of prop.cache) {
                if (!prop.address.has(key)) {
                    for (let invoker of value.values()){
                        logger.info("zookeeper unsubscribe %s-%s", Symbol.keyFor(key), invoker.address);
                        invoker.destroy();
                    }
                    prop.cache.delete(key);
                    continue;
                }
                //销毁不存在的地址
                let addressList = prop.address.get(key);
                for (let invoker of value.values()){
                    let available = invoker.isAvailable();
                    for (let address of addressList.values()) {
                        if (address != invoker.address) {
                            available = false;
                            break;
                        }
                    }
                    if (!available) {
                        logger.info("zookeeper unsubscribe %s-%s", Symbol.keyFor(key), invoker.address);
                        invoker.destroy();
                        value.delete(invoker);
                    }
                }
            }
            prop.isInit = true;
            this.emit('init');
        });
    }
    allServerAddressList(service, version, type) {
        let key = Symbol.for(`${service}:${version}`);
        let addressList = prop.address.get(key);
        if (!prop.cache.has(key)) {
            prop.cache.set(key, new Set());
        }
        for (let address of addressList.values()) {
            let have = false;
            for (let invoker of prop.cache.get(key).values()) {
                if (invoker.address == address) {
                    have = true;
                    break;
                }
            }
            if (!have) {
                prop.cache.get(key).add(prop.invokerFactory.newInvoker(service, address, type));
                break;
            }
        }
        let addresses = prop.cache.get(key);
        return addresses == null ? null : new Set(addresses);
    }
    close() {
        try {
            for (let value of prop.cache.values()) {
                for (let invoker of value.values()) {
                    invoker.destroy();
                }
            }
            prop.zk.close();
        } catch (err) {
            logger.error('stop zkClient error', err);
        }
    }
};