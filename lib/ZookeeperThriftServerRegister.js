/**
 * Created by Alone on 2017/3/6.
 */
'use strict';
const path = require('path');
const watch = require('watch');
const walk = require('walk');
const Utils = require('./util/Utils');
const logger = require('./util/LogUtils').log();
const ThriftServerRegister = require('./ThriftServerRegister');
module.exports = class ZookeeperThriftServerRegister extends ThriftServerRegister {
    constructor(client) {

    }

    register(service, version, address) {

    }

    loadFiles() {
        let walker = walk.walk(root, {
            followLinks: true,
            filters: filter || ['node_modules']
        });
        walker.on("file", (root, fileStat, next) => {
            try {
                let result = Utils.load(root, fileStat);
                let service = result.object;
                if (service && service.thrift && service.version) {
                    this.register(service.name || result.name.substring(0, result.name.length - '.js'.length))
                }
                processor.registerProcessor(name, new handler.thrift.Processor(handler.handler));
            } catch (err) {
                logger.error('加载Controller:%s:%s异常.', fileStat.name, root, err);
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
            logger.info('文件Controller加载完成!');
        });
    }
};