/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/4/29
 * Time: 16:34
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
const thrift = require('thrift');
const Q = require('q');
const domain = require('domain');
const merge = require('merge');
const Pool = require('generic-pool').Pool;
const logger = require('../util/LogUtils').log();
function create(name, type, options) {
    let connection = thrift.createConnection(this.host, this.port, options);
    let processor = new thrift.Multiplexer();
    return processor.createClient(name, type, connection);
}
module.exports = class PoolInvoker extends require('./AbstractInvoker') {
    constructor(service, address, interfaceClass, transportClass, protocolClass, maxActive, idleTime, timeOut, timeOutInterval = 1000) {
        super(address, interfaceClass, service);
        let self = this;
        this.$prop = merge(this.$prop || {}, {
            pool: null,
            service: null,
            address: null
        });
        this.$prop.service = service;
        this.$prop.address = address;
        this.$prop.timeOut = timeOut;
        this.$prop.pool = new Pool({
            name: 'thrift-client',
            create(callback) {
                callback(null, create.bind(self)(service, interfaceClass, {
                    transport: transportClass,
                    protocol: protocolClass
                }));
            },
            destroy(client) {
                client.output && client.output.close();
                client.input && client.input.close();
            },
            max: maxActive,
            idleTimeoutMillis: idleTime,
            log: (msg, level) => {
                typeof logger[level] === 'function' && Reflect.apply(logger[level], logger, [msg]);
            }
        });
        if (timeOut) {
            setInterval(() => {
                this.$prop.pool._inUseObjects.forEach(obj => {
                    if (obj._createTime && new Date().getTime() - obj._createTime > timeOut) {
                        logger.warn(`client timeout: ${obj._createTime}`);
                        if (obj._defer) {
                            obj._defer.reject(new ReferenceError('timeout.'));
                        }
                        this.$prop.pool.destroy(obj);
                    }
                });
            }, timeOutInterval);
        }
    }
    invoker(method, ...args) {
        logger.debug(`%s:%s invoker:%s args:`, this.$prop.service, this.$prop.address, method, args);
        logger.debug('pool.getMaxPoolSize() = %d', this.$prop.pool.getMaxPoolSize());
        logger.debug('pool.getPoolSize() = %d', this.$prop.pool.getPoolSize());
        logger.debug('pool.availableObjectsCount() = %d', this.$prop.pool.availableObjectsCount());
        let defer = Q.defer();
        this.$prop.pool.acquire((err, client) => {
            if (err) {
                logger.error('get %s:%s pool error', this.$prop.service, this.$prop.address, err);
                return;
            }
            try {
                if (this.$prop.timeOut) {
                    client._createTime = new Date().getTime();
                    client._defer = defer;
                }
                args.push((err, result) => {
                    this.$prop.pool.release(client);
                    let d = domain.create();
                    d.on('error', err => {logger.error('invoker service:%s address:%s method: %s error', this.$prop.service, this.$prop.address, method, err)});
                    if (err) {
                        d.run(() => {defer.reject(err);});
                        return;
                    }
                    d.run(() => {defer.resolve(result);});
                });
                Reflect.apply(client[method], client, args);
            } catch (err) {
                this.$prop.pool.release(client);
                defer.reject(err);
            }
        }, 0);
        return defer.promise;
    }
    destroy() {
        this.$prop.pool.drain(() => {this.$prop.pool.destroyAllNow(null);});
    }
};