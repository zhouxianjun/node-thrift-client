/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/5/4
 * Time: 17:12
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
const ReferenceBean = require('../ReferenceBean');
module.exports = class {
    static init() {
        let service = require('../../test/service/DemoService');
        console.log(service, typeof service);
        let obj = new service();
        if (obj instanceof ReferenceBean) {
            Object.getOwnPropertyNames(service.prototype).forEach(method => {
                if (method != 'constructor' && typeof obj.prototype[method] == 'function') {
                    service[method] = new Proxy(service[method], {
                        apply(target, that, args) {
                            console.log('123');
                            return 'haha';
                        }
                    });
                }
                console.log(method);
            });
        }
    }
};