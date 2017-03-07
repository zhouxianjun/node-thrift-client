/**
 * Created by Alone on 2017/3/6.
 */
'use strict';
const path = require('path');
const watch = require('watch');
const walk = require('walk');
const merge = require('merge');
const co = require('co');
const thunkify = require('thunkify');
const thrift = require('thrift');
const zookeeper = require('node-zookeeper-client');
const Utils = require('./util/Utils');
const logger = require('./util/LogUtils').log();
const ThriftServerRegister = require('./ThriftServerRegister');
const defaultConfig = {
    host: '127.0.0.1',
    port: 9090,
    warmup: 10 * 60 * 10000,
    root: 'rpc',
    namespace: 'thrift',
    transport: thrift.TFramedTransport,
    protocol: thrift.TCompactProtocol
};
module.exports = class ZookeeperThriftServerRegister extends ThriftServerRegister {
    constructor(client, config = {}) {
        super();
        this['config'] = merge(config, defaultConfig);
        this['services'] = new Set();
        this['client'] = client;
        this['root'] = `/${this.config.root}/${this.config.namespace}`;

        this['processor'] = new thrift.MultiplexedProcessor();
        this['server'] = thrift.createMultiplexServer(this.processor, this.config);
        this.server.listen(this.config.port);
    }

    * register(service, version, address) {
        let servicePath = `${this.root}/${service}/${version}`;
        yield Utils.createZkPath(this.client, servicePath);
        let existsKey = yield thunkify(this.client.exists).apply(this.client, [`${servicePath}/${address}`, null]);
        if (existsKey) return;
        let createPath = yield thunkify(this.client.create).apply(this.client, [`${servicePath}/${address}`, null, zookeeper.CreateMode.EPHEMERAL]);
        logger.info(`register path:${createPath} for zookeeper.`);
    }

    load(root, filter) {
        let walker = walk.walk(root, {
            followLinks: true,
            filters: filter || ['node_modules']
        });
        walker.on("file", (root, fileStat, next) => {
            try {
                let result = Utils.load(root, fileStat);
                let service = result.object;
                if (service && service.thrift && service.version) {
                    let address = `${this.config.host}:${this.config.port}:${service.weight || 100}:${new Date().getTime()}:${this.config.warmup}`;
                    let name = service.name || result.name.substring(0, result.name.length - '.js'.length);
                    let test = async () => {
                        yield this.register(name, service.version, address);
                        this.processor.registerProcessor(name, new service.thrift.Processor(service));
                        logger.info(`register processor ${name} - ${path.resolve(__dirname, result.path)}`);
                    };
                    test().catch(err => {
                        logger.error('加载thrift:%s:%s异常.', fileStat.name, root, err);
                    });
                    /*co(function *() {
                        yield this.register(name, service.version, address);
                        this.processor.registerProcessor(name, new service.thrift.Processor(service));
                        logger.info(`register processor ${name} - ${path.resolve(__dirname, result.path)}`);
                    }.bind(this)).catch(err => {
                        logger.error('加载thrift:%s:%s异常.', fileStat.name, root, err);
                    });*/
                }
            } catch (err) {
                logger.error('加载thrift:%s:%s异常.', fileStat.name, root, err);
            }
            next();
        });
        walker.on("errors", (root, nodeStatsArray, next) => {
            nodeStatsArray.forEach(n => {
                logger.error("[ERROR] " + n);
            });
            next();
        });
        walker.on("end", () => {
            logger.info('文件thrift加载完成!');
        });
    }
};