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
    constructor(client, config = {}, root, filter) {
        super();
        this['config'] = merge(config, defaultConfig);
        this['services'] = new Set();
        this['client'] = client;

        this['processor'] = new thrift.MultiplexedProcessor();
        this['server'] = thrift.createMultiplexServer(this.processor, this.config);
        this.server.listen(this.config.port);

        this.mkdirp(`/${this.config.root}/${this.config.namespace}`, (error, results) => {
            if (error && error.getCode() != zookeeper.Exception.NODE_EXISTS) {
                logger.error(`create namespace error`, error.stack);
                return;
            }
            this.emit('ready');
            if (root) {
                this.loadFiles(root, filter);
            }
        });
    }

    register(service, version, address) {
        this.mkdirp(`${service}/${version}`, err => {
            if (err && err.getCode() != zookeeper.Exception.NODE_EXISTS) {
                logger.error(`create service error`, err.stack);
                return;
            }
            this.submit(`${service}/${version}/${address}`).catch(err => {console.log(err)});
        });
    }

    submit(path) {
        path = `/${this.config.root}/${this.config.namespace}/${path}`;
        return co(function *() {
            let existsKey = yield thunkify(this.client.exists).apply(this.client, [path, null]);
            if (existsKey) return;
            let createPath = yield thunkify(this.client.create).apply(this.client, [path, null, zookeeper.CreateMode.EPHEMERAL]);
            logger.info(`register path:${createPath} for zookeeper.`);
        }.bind(this));
    }

    loadFiles(root, filter) {
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
                    this.register(name, service.version, address);
                    this.processor.registerProcessor(name, new service.thrift.Processor(service));
                    logger.info(`register processor ${name} - ${path.resolve(__dirname, result.path)}`);
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

    mkdirp(path, cb) {
        let pathArray = path.split('/');
        let transaction = this.client.transaction();
        let orgPath = '';
        for(let p of pathArray) {
            if (p) {
                let path2 = orgPath ? `/${orgPath}/${p}` : `/${p}`;
                console.log(path2);
                transaction.create(path2);
                orgPath += `/${p}`;
            }
        }
        transaction.commit(cb);
    }
};