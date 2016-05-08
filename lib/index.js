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
const walk = require('walk');
const logger = require('./util/LogUtils');
const Utils = require('./util/Utils');
const ReferenceBean = require('./ReferenceBean');
let ThriftServerProviderFactory = require('./provider/ThriftServerProviderFactory');
let instance = null;
const prop = {
    services: new Map()
};
module.exports = class ThriftClient {
    constructor(providerFactory, loadBalance) {
        if (!instance)
            instance = new ThriftClient(providerFactory, loadBalance);
        return instance;
    }
    addService(name, service) {
        if (service instanceof ReferenceBean) {
            prop.set(Symbol.for(`service_${name}`), service);
        }
        return this;
    }
    useFileSystem(root, filter) {
        let self = this;
        let walker = walk.walk(root, {
            followLinks: true,
            filters: filter || ['node_modules']
        });
        function onFile(root, fileStat){
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
                    if (service.prototype.constructor === ReferenceBean.prototype.constructor) {
                        let obj = Reflect.construct(service.prototype.constructor, 1);
                        self.addService(obj.service, obj);
                    }
                    console.log(service);
                }
            } catch (err){
                logger.error('加载Service:%s:%s异常.', fileStat.name, base, err);
            }
        }
        walker.on("file", (root, fileStat, next) => {
            onFile(root, fileStat);
            next();
        });
        walker.on("errors", (root, nodeStatsArray, next) => {
            nodeStatsArray.forEach(n => {
                logger.error("[ERROR] " + n);
            });
            next();
        });
        walker.on("end", function(){
            logger.info('文件Service加载完成!');
        });
        Utils.watch(dir, (f, prev) => {
            onFile(path.dirname(f), this);
        }, (f, prev) => {
            if(require.cache[f]){
                let name = this.name.substring(0, this.name.length - '.js'.length);
                Reflect.deleteProperty(require.cache, f);
            }
        });
        return this;
    }
};
exports.util = Utils;