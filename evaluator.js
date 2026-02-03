// evaluator.js - 分离求值器和宏系统

class Environment {
    constructor(parent = null) {
        this.parent = parent;
        this.bindings = new Map();
    }

    define(symbol, value) {
        this.bindings.set(symbol, value);
        return value;
    }

    set(symbol, value) {
        if (this.bindings.has(symbol)) {
            this.bindings.set(symbol, value);
            return value;
        } else if (this.parent) {
            return this.parent.set(symbol, value);
        } else {
            throw new Error(`未定义的变量: ${symbol}`);
        }
    }

    get(symbol) {
        if (this.bindings.has(symbol)) {
            return this.bindings.get(symbol);
        } else if (this.parent) {
            return this.parent.get(symbol);
        } else {
            throw new Error(`未定义的变量: ${symbol}`);
        }
    }

    has(symbol) {
        if (this.bindings.has(symbol)) return true;
        if (this.parent) return this.parent.has(symbol);
        return false;
    }
}


// evaluator.js - 配合宏展开器的求值器
class Evaluator {
    constructor(macroExpander) {
        this.globalEnv = this.createGlobalEnvironment();
        this.macroExpander = macroExpander || new MacroExpander();
        this.debugLevel = 1;
    }

    log(level, ...args) {
        if (this.debugLevel >= level) {
            console.log(...args);
        }
    }

    createGlobalEnvironment() {
        const env = new Environment();
        
        // 算术运算
        const makeNumericOp = (op) => {
            return (...args) => {
                if (args.length === 0) {
                    throw new Error(`需要至少一个参数`);
                }
                return args.reduce(op);
            };
        };
        
        env.define('+', makeNumericOp((a, b) => a + b));
        env.define('-', makeNumericOp((a, b) => a - b));
        env.define('*', makeNumericOp((a, b) => a * b));
        env.define('/', makeNumericOp((a, b) => a / b));
        env.define('mod', (a, b) => a % b);
        
        // 比较运算
        env.define('=', (...args) => {
            if (args.length < 2) return true;
            return args.every((v, i) => i === 0 || v === args[i-1]);
        });
        env.define('!=', (...args) => {
            if (args.length < 2) return false;
            return !args.every((v, i) => i === 0 || v === args[i-1]);
        });
        env.define('>', (a, b) => a > b);
        env.define('<', (a, b) => a < b);
        env.define('>=', (a, b) => a >= b);
        env.define('<=', (a, b) => a <= b);
        
        // 逻辑运算
        env.define('not', (x) => !x);
        env.define('and', (...args) => args.every(x => x));
        env.define('or', (...args) => args.some(x => x));
        
        // 数学函数
        env.define('sqrt', Math.sqrt);
        env.define('abs', Math.abs);
        env.define('sin', Math.sin);
        env.define('cos', Math.cos);
        env.define('tan', Math.tan);
        env.define('log', Math.log);
        env.define('exp', Math.exp);
        env.define('pow', Math.pow);
        
        // 类型判断
        env.define('number?', (x) => typeof x === 'number');
        env.define('string?', (x) => typeof x === 'string');
        env.define('list?', (x) => Array.isArray(x));
        env.define('symbol?', (x) => false);
        env.define('boolean?', (x) => typeof x === 'boolean');
        env.define('null?', (x) => x === null || (Array.isArray(x) && x.length === 0));
        
        // 列表操作
        env.define('list', (...args) => args);
        env.define('cons', (x, xs) => [x, ...xs]);
        env.define('first', (xs) => xs[0]);
        env.define('rest', (xs) => xs.slice(1));
        env.define('len', (xs) => xs.length);
        env.define('append', (...args) => args.flat());
        env.define('reverse', (xs) => [...xs].reverse());
        
        // 输入输出
        env.define('print', (...args) => {
            const result = args.map(arg => {
                if (typeof arg === 'string') {
                    // 如果是带引号的字符串，去掉引号显示
                    if (arg.startsWith('"') && arg.endsWith('"')) {
                        return arg.slice(1, -1);
                    }
                    return arg;
                } else if (Array.isArray(arg)) {
                    return `[${arg.join(' ')}]`;
                } else {
                    return String(arg);
                }
            }).join(' ');
            console.log(result);
            return result;
        });
        
        env.define('cat', (...args) => args.join(''));
        
        return env;
    }

    eval(expr, env = this.globalEnv, depth = 0) {
        const indent = '  '.repeat(depth);
        this.log(3, `${indent}eval: ${JSON.stringify(expr)}`);
        
        // 处理原子值
        if (typeof expr === 'number' || typeof expr === 'boolean' || expr === null) {
            this.log(3, `${indent}-> 原子值: ${expr}`);
            return expr;
        }
        
        if (typeof expr === 'string') {
            // 检查是否是字符串字面量
            if (expr.startsWith('"') && expr.endsWith('"')) {
                this.log(3, `${indent}-> 字符串: ${expr}`);
                //去掉引号
                return expr.slice(1, -1);
            }
            
            // 符号查找
            try {
                const value = env.get(expr);
                this.log(3, `${indent}-> 符号 ${expr}: ${JSON.stringify(value)}`);
                return value;
            } catch (error) {
                throw new Error(`${expr} 未定义`);
            }
        }
       
        // 处理列表
        if (!Array.isArray(expr) || expr.length === 0) {
            this.log(3, `${indent}-> 空列表或非列表: ${JSON.stringify(expr)}`);
            return expr;
        }
        
        const [first, ...rest] = expr;
        this.log(2, `${indent}列表: ${JSON.stringify(first)} ${rest.length > 0 ? '...' : ''}`);
        
        // 处理特殊形式

        if(first === 'symbol?') {
            
            return env.has(rest[0]);
        }
        if (first === 'quote'|| first === 'q') {
            const quoted = rest[0];
            this.log(2, `${indent}quote -> ${JSON.stringify(quoted)}`);
            return quoted;
        }
        
        if (first === 'def') {
            const [symbol, valueExpr] = rest;
            this.log(2, `${indent}def ${symbol}`);
            const value = this.eval(valueExpr, env, depth + 1);
            env.define(symbol, value);
            this.log(2, `${indent}def ${symbol} = ${JSON.stringify(value)}`);
            return value;
        }
        
        if (first === 'set') {
            const [symbol, valueExpr] = rest;
            this.log(2, `${indent}set ${symbol}`);
            const value = this.eval(valueExpr, env, depth + 1);
            env.set(symbol, value);
            this.log(2, `${indent}set ${symbol} = ${JSON.stringify(value)}`);
            return value;
        }
        
        if (first === 'fn') {
            const [params, body] = rest;
            this.log(2, `${indent}fn ${JSON.stringify(params)} -> ${JSON.stringify(body)}`);
            return (...args) => {
                const fnEnv = new Environment(env);
                params.forEach((param, i) => {
                    fnEnv.define(param, args[i]);
                });
                return this.eval(body, fnEnv, depth + 1);
            };
        }
        
        if (first === 'if') {
            const [test, conseq, alt] = rest;
            this.log(2, `${indent}if test`);
            const testResult = this.eval(test, env, depth + 1);
            this.log(2, `${indent}if test = ${testResult}`);
            return testResult ? this.eval(conseq, env, depth + 1) : this.eval(alt, env, depth + 1);
        }
        
        if (first === 'cond') {
            for (const [test, expr] of rest) {
                if (test === 'else' || this.eval(test, env, depth + 1)) {
                    return this.eval(expr, env, depth + 1);
                }
            }
            return null;
        }
        
        if (first === 'do') {
            this.log(2, `${indent}do (${rest.length} 表达式)`);
            let result = null;
            for (const expr of rest) {
                result = this.eval(expr, env, depth + 1);
            }
            this.log(2, `${indent}do -> ${JSON.stringify(result)}`);
            return result;
        }
        
        if (first === 'let') {
            const [bindings, ...body] = rest;
            this.log(2, `${indent}let ${JSON.stringify(bindings)}`);
            const newEnv = new Environment(env);
            
            for (const [symbol, expr] of bindings) {
                newEnv.define(symbol, this.eval(expr, newEnv, depth + 1));
            }
            
            let result = null;
            for (const expr of body) {
                result = this.eval(expr, newEnv, depth + 1);
            }
            return result;
        }
        
        if (first === 'while') {
            const [test, ...body] = rest;
            this.log(2, `${indent}while`);
            let result = null;
            let iteration = 0;
            
            while (this.eval(test, env, depth + 1)) {
                this.log(3, `${indent}while iteration ${++iteration}`);
                for (const expr of body) {
                    result = this.eval(expr, env, depth + 1);
                }
            }
            
            this.log(2, `${indent}while -> ${JSON.stringify(result)}`);
            return result;
        }
        
        // 在求值器中更新 macro 特殊形式处理
if (first === 'macro') {
    const [name, params, body] = rest;
    this.log(1, `${indent}定义宏: ${name} ${JSON.stringify(params)}`);
    
    // 将 ampersand 语法转换为宏展开器期望的格式
    const processedParams = this.processMacroParams(params);
    
    const macro = {
        type: 'macro',
        params: processedParams,
        body
    };
    env.define(name, macro);
    return macro;
}

        
        // 普通函数调用
        this.log(3, `${indent}调用: ${first}`);
        const operator = this.eval(first, env, depth + 1);
        
        // 检查是否是宏
        if (operator && operator.type === 'macro') {
            this.log(1, `${indent}展开宏: ${first}`);
            this.log(2, `${indent}宏参数: ${JSON.stringify(rest)}`);
            
            // 使用宏展开器展开宏
            const expanded = this.macroExpander.expandMacro(operator, rest);
            this.log(1, `${indent}宏 ${first} 展开结果: ${JSON.stringify(expanded)}`);
            //去掉quote 
            let finalExpanded = expanded;
            if (Array.isArray(expanded) &&( expanded[0] === 'quote'|| expanded[0] === 'q')) {
                finalExpanded = expanded[1];
                this.log(2, `${indent}去掉quote后的宏展开结果: ${JSON.stringify(finalExpanded)}`);
            }
            // 求值展开后的表达式
            return this.eval(finalExpanded, env, depth + 1);
        }
        
        // 检查是否是函数
        if (typeof operator === 'function') {
            this.log(3, `${indent}求值参数: ${rest.length} 个`);
            const evaluatedArgs = rest.map(arg => this.eval(arg, env, depth + 1));
            this.log(3, `${indent}参数值: ${JSON.stringify(evaluatedArgs)}`);
            this.log(3, `${indent}调用函数`);
            const result = operator(...evaluatedArgs);
            this.log(3, `${indent}函数结果: ${JSON.stringify(result)}`);
            return result;
        }
        
        throw new Error(`${first} 不是函数或特殊形式`);
    }

    // 添加辅助方法处理宏参数
processMacroParams(params) {
    const result = [];
    
    for (let i = 0; i < params.length; i++) {
        const item = params[i];
        
        if (Array.isArray(item) && item[0] === 'ampersand') {
            // 将 ['ampersand', 'param'] 转换为 ['ampersand', 'param']
            result.push(item);
        } else {
            result.push(item);
        }
    }
    
    return result;
}

    // 获取环境中的所有绑定
    getEnvironmentBindings() {
        const bindings = [];
        for (const [key, value] of this.globalEnv.bindings) {
            let type;
            if (typeof value === 'function') {
                type = '内置函数';
            } else if (value && value.type === 'macro') {
                type = '宏';
            } else if (typeof value === 'number') {
                type = '数值';
            } else if (typeof value === 'string') {
                type = '字符串';
            } else {
                type = '其他';
            }
            bindings.push({ key, value, type });
        }
        return bindings;
    }
}

// 完整测试
if (typeof require !== 'undefined' && require.main === module) {
    const { MacroExpander } = require('./macro-expander.js');
    const { Parser } = require('./parser.js');
    
    console.log('=== 完整测试：解析、展开、求值 ===\n');
    
    // 创建组件
    const expander = new MacroExpander();
    expander.debugLevel = 1;
    
    const evaluator = new Evaluator(expander);
    evaluator.debugLevel = 1;
    
    const parser = new Parser();
    
    // 测试代码
    const code = `
        [macro for [[x in seq] & body] 
            [quote [do
                [def temp-seq ~seq]
                [while [not [null? temp-seq]]
                    [def ~x [first temp-seq]]
                    ~@body
                    [set temp-seq [rest temp-seq]]
                ]
                null
            ]]
        ]
        
        [for [n in [list 1 2 3]] [print n]]
    `;
    
    try {
        // 解析
        console.log('解析代码...');
        const expressions = parser.readAll(code);
        
        console.log('\n解析结果:');
        expressions.forEach((expr, i) => {
            console.log(`表达式 ${i}: ${JSON.stringify(expr)}`);
        });
        
        // 求值
        console.log('\n求值结果:');
        expressions.forEach((expr, i) => {
            console.log(`\n执行表达式 ${i}:`);
            try {
                const result = evaluator.eval(expr);
                console.log(`结果: ${JSON.stringify(result)}`);
            } catch (error) {
                console.error(`错误: ${error.message}`);
                if (error.stack) console.error(error.stack);
            }
        });
        
    } catch (error) {
        console.error('错误:', error.message);
        if (error.stack) console.error(error.stack);
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Evaluator };
}