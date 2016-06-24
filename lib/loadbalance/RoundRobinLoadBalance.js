/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/5/5
 * Time: 16:25
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
const merge = require('merge');
module.exports = class RoundRobinLoadBalance extends require('./AbstractLoadBalance') {
    constructor(...args) {
        super(args);
        this.$prop = merge(this.$prop || {}, {
            sequences: new Map(),
            weightSequences: new Map()
        });
    }
    doSelect(invokers, method) {
        let array = [...invokers];
        let key = Symbol.for(`${array[0].interfaceName}:${method}`);
        let length = invokers.size; // 总个数
        let maxWeight = 0; // 最大权重
        let minWeight = AtomicPositiveInteger.MAX_VALUE; // 最小权重
        for (let i = 0; i < length; i++) {
            let weight = this.getWeight(array[i]);
            maxWeight = Math.max(maxWeight, weight); // 累计最大权重
            minWeight = Math.min(minWeight, weight); // 累计最小权重
        }
        if (maxWeight > 0 && minWeight < maxWeight) { // 权重不一样
            let weightSequence = this.$prop.weightSequences.get(key);
            if (weightSequence == null) {
                this.$prop.weightSequences.set(key, new AtomicPositiveInteger());
                weightSequence = this.$prop.weightSequences.get(key);
            }
            let currentWeight = weightSequence.getAndIncrement() % maxWeight;
            let weightInvokers = new Set();
            for (let invoker of invokers.values()) { // 筛选权重大于当前权重基数的Invoker
                if (this.getWeight(invoker) > currentWeight) {
                    weightInvokers.add(invoker);
                }
            }
            let weightLength = weightInvokers.size;
            if (weightLength == 1) {
                return [...weightInvokers][0];
            } else if (weightLength > 1) {
                invokers = weightInvokers;
                length = invokers.size;
            }
        }
        let sequence = this.$prop.sequences.get(key);
        if (sequence == null) {
            this.$prop.sequences.set(key, new AtomicPositiveInteger());
            sequence = this.$prop.sequences.get(key);
        }
        // 取模轮循
        return [...invokers][sequence.getAndIncrement() % length];
    }
};
const AtomicPositiveInteger = class AtomicPositiveInteger {
    constructor() {
        this.value = 0;
    }
    getAndIncrement() {
        return this.value = (this.value >= AtomicPositiveInteger.MAX_VALUE ? 0 : this.value + 1);
    }

    /**
     * @return {number}
     */
    static get MAX_VALUE() {
        return 0x7fffffff;
    }
};