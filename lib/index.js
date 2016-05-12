/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/4/29
 * Time: 11:49
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
const path = require('path');
const EventEmitter = require('events');
const walk = require('walk');
const logger = require('./util/LogUtils').log();
const Utils = require('./util/Utils');
const ReferenceBean = require('./ReferenceBean');
let ThriftServerProviderFactory = require('./provider/ThriftServerProviderFactory');
let instance = null;
const prop = {
    services: new Map(),
    providerFactory: null,
    loadBalance: null
};
module.exports = class ThriftClient extends EventEmitter {
    constructor(providerFactory, loadBalance = new ThriftClient.loadBalance.RandomLoadBalance()) {
        super();
        prop.providerFactory = providerFactory;
        prop.loadBalance = loadBalance;
        console.log(loadBalance.selector.toString())
    }
    static instance(providerFactory, loadBalance) {
        if (!instance) {
            instance = new ThriftClient(providerFactory, loadBalance);
        }
        return instance;
    }
    getService(service) {
        if (Reflect.getPrototypeOf(service) === ReferenceBean) {
            return prop.services.get(service);
        }
        return null;
    }
    addService(service) {
        let obj = service.instance(prop.providerFactory, prop.loadBalance);
        if (obj instanceof ReferenceBean) {
            logger.info('add service %s:%s', obj.service, service);
            prop.services.set(service, obj);
        }
        return this;
    }
    delService(service) {
        if (Reflect.getPrototypeOf(service) === ReferenceBean) {
            logger.info('delete service %s', service);
            prop.services.delete(service);
        }
        return this;
    }
    useFileSystem(root, filter) {
        let walker = walk.walk(root, {
            followLinks: true,
            filters: filter || ['node_modules']
        });
        walker.on("file", (root, fileStat, next) => {
            this.onFile(root, fileStat);
            next();
        });
        walker.on("errors", (root, nodeStatsArray, next) => {
            nodeStatsArray.forEach(n => {
                logger.error("[ERROR] " + n);
            });
            next();
        });
        walker.on("end", () => {
            logger.info('文件Service加载完成!');
            this.emit('fileSystemInit');
        });
        Utils.watch(root, (curr, f, prev) => {
            this.onFile(path.dirname(f), curr);
        }, (curr, f, prev) => {
            if(require.cache[f]){
                this.delService(require.cache[f]);
                Reflect.deleteProperty(require.cache, f);
            }
        });
        return this;
    }
    onFile(root, fileStat) {
        let base = path.join(root, fileStat.name);
        try{
            if(fileStat.name.endsWith('.js')) {
                let pwd = path.relative(__dirname, base);
                if (!pwd.startsWith('.') && !pwd.startsWith('/')) {
                    pwd = './' + pwd;
                }
                if (require.cache[base]) {
                    Reflect.deleteProperty(require.cache, base);
                    logger.info('reload file: %s:%s', fileStat.name, base);
                }
                let service = require(pwd);
                if (Reflect.getPrototypeOf(service) === ReferenceBean) {
                    this.addService(service);
                }
            }
        } catch (err){
            logger.error('加载Service:%s:%s异常.', fileStat.name, base, err);
        }
    }

    static get util() {
        return Utils;
    }
    static get zookeeper() {
        return require('node-zookeeper-client');
    }
    static get thrift() {
        return require('thrift');
    }
    static get invoker() {
        return {
            AbstractInvoker: require('../lib/invoker/AbstractInvoker'),
            PoolInvoker: require('../lib/invoker/PoolInvoker'),
            factory: {
                InvokerFactory: require('../lib/invoker/factory/InvokerFactory'),
                PoolInvokerFactory: require('../lib/invoker/factory/PoolInvokerFactory')
            }
        };
    }
    static get loadBalance() {
        return {
            AbstractLoadBalance: require('../lib/loadbalance/AbstractLoadBalance'),
            RandomLoadBalance: require('../lib/loadbalance/RandomLoadBalance'),
            RoundRobinLoadBalance: require('../lib/loadbalance/RoundRobinLoadBalance')
        };
    }
    static get provider() {
        return {
            ThriftServerProviderFactory: ThriftServerProviderFactory,
            ZookeeperThriftServerProviderFactory: require('../lib/provider/ZookeeperThriftServerProviderFactory')
        };
    }
    static get logger() {
        return require('./util/LogUtils');
    }
};