/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/4/29
 * Time: 16:37
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
module.exports = class AbstractInvoker extends require('./Invoker') {
    constructor(address, interfaceClass, interfaceName) {
        super();
        let prop = {
            weight: 100,
            startTime: 0,
            warmup: 10 * 60 * 1000,
            host: null,
            port: 0,
            interfaceClass: null,
            interfaceName: null,
            address: null
        };
        let hostname = address.split(":");
        if (hostname.length >= 3) {
            prop.weight = parseInt(hostname[2]);
        }
        if (hostname.length >= 4) {
            prop.startTime = parseInt(hostname[3]);
        }
        if (hostname.length == 5) {
            prop.warmup = parseInt(hostname[4]);
        }
        prop.host = hostname[0];
        prop.port = parseInt(hostname[1]);
        prop.interfaceClass = interfaceClass;
        prop.interfaceName = interfaceName;
        prop.address = address;
        this.$prop = prop;
    }
    get address(){return this.$prop.address;}

    get host(){return this.$prop.host;}

    get port(){return this.$prop.port;}

    get weight(){return this.$prop.weight;}

    get startTime(){return this.$prop.startTime;}

    get warmup(){return this.$prop.warmup;}

    get interface(){return this.$prop.interfaceClass;}

    get interfaceName(){return this.$prop.interfaceName;}
};