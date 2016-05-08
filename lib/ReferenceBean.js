/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/5/4
 * Time: 17:31
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
const Q = require('q');
const RandomLoadBalance = require('./loadbalance/RandomLoadBalance');
module.exports = class ReferenceBean {
    constructor(providerFactory, loadBalance = RandomLoadBalance) {
        Reflect.ownKeys(new.target.prototype).forEach(method => {
            let descriptor = Reflect.getOwnPropertyDescriptor(new.target.prototype, method);
            if (method != 'constructor' &&
                descriptor.get === undefined &&
                descriptor.set === undefined &&
                typeof descriptor.value == 'function') {
                Reflect.set(new.target.prototype, method, new Proxy(new.target.prototype[method], {
                    apply(target, that, args) {
                        let address = providerFactory.allServerAddressList(that.service, that.version, that.type);
                        let invoker = loadBalance.selector(address, target.name);
                        let defer = Q.defer();
                        let params = [target.name];
                        [...args].forEach(arg => {params.push(arg)});
                        Reflect.apply(invoker.invoker, invoker, params).then(result => {
                            defer.resolve(result);
                        }).catch( err => {
                            defer.reject(err);
                        });
                        return defer.promise;
                    }
                }));
            }
        });
    }
    get service() {
        console.log(__filename);
    }
    get version() {
        return '1.0.0'
    }
    get type() {
        throw new ReferenceError('type is null');
    }
};