/**
 * Created by zhouxianjun on 16-5-6.
 */
'use strict';
module.exports = class Utils {
    static watch(dir, onChange, onDelete){
        const watch = require('watch');
        const path = require('path');
        watch.watchTree(dir, (f, curr, prev) => {
            if(!(typeof f == "object" && prev === null && curr === null) && curr != null && (curr.isFile() || curr.nlink === 0)){
                let resolve = path.resolve(f);
                if(!curr.name)curr.name = path.basename(resolve);
                if(curr.nlink === 0){
                    if(typeof onDelete === 'function'){
                        Reflect.apply(onDelete, curr, [resolve, prev]);
                    }
                    return;
                }
                if(typeof onChange === 'function'){
                    Reflect.apply(onChange, curr, [resolve, prev]);
                }
            }
        });
    }
};
