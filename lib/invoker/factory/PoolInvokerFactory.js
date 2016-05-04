/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/5/4
 * Time: 14:30
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
const PoolInvoker = require('../PoolInvoker');
const prop = {
    transportClass: null,
    protocolClass: null,
    maxActive: null,
    idleTime: null
};
module.exports = class extends require('./InvokerFactory') {
    constructor(transportClass, protocolClass, maxActive = 100, idleTime = 180000) {
        super();
        prop.transportClass = transportClass;
        prop.protocolClass = protocolClass;
        prop.maxActive = maxActive;
        prop.idleTime = idleTime;
    }
    set transportClass(transportClass) {
        prop.transportClass = transportClass;
    }
    set protocolClass(protocolClass) {
        prop.protocolClass = protocolClass;
    }
    set maxActive(maxActive) {
        prop.maxActive = maxActive;
    }
    set idleTime(idleTime) {
        prop.idleTime = idleTime;
    }
    newInvoker(service, address, type) {
        return new PoolInvoker(service, address, type, prop.transportClass, prop.protocolClass, prop.maxActive, prop.idleTime);
    }
};