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
const ThriftClient = require('../lib/index');
let demo = require('./thrift/Demo');

var client = ThriftClient.zookeeper.createClient('127.0.0.1:2181');
client.connect();
client.on('connected', function() {
    let providerFactory = new ThriftClient.provider.ZookeeperThriftServerProviderFactory(
        client,
        new ThriftClient.invoker.factory.PoolInvokerFactory(
            ThriftClient.thrift.TFramedTransport,
            ThriftClient.thrift.TCompactProtocol
        ),
        'demo'
    );
    providerFactory.on('init', () => {
        let thriftClient = new ThriftClient(providerFactory, new ThriftClient.loadBalance.RoundRobinLoadBalance());
        thriftClient.on('fileSystemInit', () => {
            const DemoService = require('../test/service/DemoService');
            let demoService = DemoService.instance();
            let start = new Date();
            for (let i = 0; i < 100; i++) {
                demoService.say('Gary').then(result => {
                    console.log(`result<${i}>:${result}`);
                    if (i == 99) {
                        console.log(`running time: ${new Date().getTime() - start.getTime()}`);
                    }
                }, err => {
                    console.log('error ~');
                    console.error(err.stack);
                });
            }
        });
        thriftClient.useFileSystem('./service/');
    });
});
client.on('error', function(err) {
    console.error(err.stack);
});