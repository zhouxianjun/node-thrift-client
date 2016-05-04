/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/4/29
 * Time: 13:57
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
const PoolInvokerFactory = require('../lib/invoker/factory/PoolInvokerFactory');
const defaultMethods = ['new_seqid', 'seqid'];
let demo = require('./thrift/Demo');
let ZookeeperThriftServerProviderFactory = require('../lib/provider/ZookeeperThriftServerProviderFactory');
var zookeeper = require('node-zookeeper-client');

var client = zookeeper.createClient('localhost:2181');
client.connect();
let providerFactory;
client.on('connected', function() {
    providerFactory = new ZookeeperThriftServerProviderFactory(client, new PoolInvokerFactory(thrift.TFramedTransport, thrift.TCompactProtocol), 'demo');
    setTimeout(() => {
        let address = providerFactory.allServerAddressList('Demo', '1.0.0', demo);
        [...address][0].invoker('say', 'Gary').then(result => {
            console.log(`result:${result}`);
        }).catch( err => {
            console.error(err.stack);
        });
    }, 2000);
});
client.on('error', function(err) {
    console.error(err.stack);
});