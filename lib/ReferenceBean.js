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
module.exports = class ReferenceBean {
    constructor() {
        Object.getOwnPropertyNames(this).forEach(method => {
            let descriptor = Object.getOwnPropertyDescriptor(this, method);
            console.log(descriptor.get === undefined);
            if (descriptor.get === undefined && descriptor.set === undefined && typeof descriptor.value == 'function' &&
                method != 'constructor' && typeof this.prototype[method] == 'function') {
                this[method] = new Proxy(this[method], {
                    apply(target, that, args) {
                        console.log('123');
                        return 'haha';
                    }
                });
            }
            console.log(method);
        });
    }
    get service() {
        console.log(__filename);
    }
};