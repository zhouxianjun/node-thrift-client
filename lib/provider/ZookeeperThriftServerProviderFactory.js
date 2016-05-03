/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/4/29
 * Time: 15:54
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
const assert = require('assert');
const ThriftServerProviderFactory = require('./ThriftServerProviderFactory');
const RPC = 'rpc';
let zk = null;
function listChildren(root, callback) {
    console.log(`list:${root}`);
    zk.getChildren(
        root,
        event => listChildren(root),
        function(error, children, stat) {
            assert.ifError(error);
            children.forEach(p => {
                let val = `${root}/${p}`;
                zk.getChildren(val, (err, child) => {
                    if (!child || child.length <= 0) {
                        callback && callback(val);
                        return;
                    }
                    listChildren(val, callback);
                });
            });
        }
    );
}
module.exports = class ZookeeperThriftServerProviderFactory extends ThriftServerProviderFactory {
    constructor(zookeeper, root = 'thrift') {
        super();
        zk = zookeeper;
        //list root
        listChildren(`/${RPC}/${root}`, p => {console.log(p)});
    }
    allServerAddressList() {

    }
};