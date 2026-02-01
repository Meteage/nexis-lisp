// evaluator.js - 修正版本
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

class Evaluator {
    constructor() {
        this.globalEnv = this.createGlobalEnvironment();
    }

    createGlobalEnvironment() {
        const env = new Environment();
        
        // 算术运算
        const makeNumericOp = (op) => {
            return (...args) => {
                if (args.length === 0) {
                    throw new Error(`${op} 需要至少一个参数`);
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
        env.define('symbol?', (x) => typeof x === 'string' && /^[^\d]/.test(x));
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
            const result = args.map(arg => 
                typeof arg === 'string' ? arg :
                Array.isArray(arg) ? `[${arg.join(' ')}]` :
                String(arg)
            ).join(' ');
            console.log(result);
            return result;
        });
        
        env.define('cat', (...args) => args.join(''));
        
        return env;
    }

    eval(expr, env = this.globalEnv) {
        // 处理原子值
        if (typeof expr === 'number') {
            return expr;
        }
        
        if (typeof expr === 'string') {
            // 关键修复：字符串可能是符号，需要从环境中获取
            return env.get(expr);
        }
        
        // 处理列表
        if (!Array.isArray(expr) || expr.length === 0) {
            return expr;
        }
        
        const [first, ...rest] = expr;
        
        // 特殊形式
        if (first === 'def') {
            const [symbol, valueExpr] = rest;
            const value = this.eval(valueExpr, env);
            env.define(symbol, value);
            return value;
        }
        
        if (first === 'set') {
            const [symbol, valueExpr] = rest;
            const value = this.eval(valueExpr, env);
            env.set(symbol, value);
            return value;
        }
        
        if (first === 'fn') {
            const [params, body] = rest;
            return (...args) => {
                const fnEnv = new Environment(env);
                params.forEach((param, i) => {
                    fnEnv.define(param, args[i]);
                });
                return this.eval(body, fnEnv);
            };
        }
        
        if (first === 'if') {
            const [test, conseq, alt] = rest;
            const testResult = this.eval(test, env);
            return testResult ? this.eval(conseq, env) : this.eval(alt, env);
        }
        
        if (first === 'cond') {
            for (const [test, expr] of rest) {
                if (test === 'else' || this.eval(test, env)) {
                    return this.eval(expr, env);
                }
            }
            return null;
        }
        
        if (first === 'do') {
            let result = null;
            for (const expr of rest) {
                result = this.eval(expr, env);
            }
            return result;
        }
        
        if (first === 'let') {
            const [bindings, ...body] = rest;
            const newEnv = new Environment(env);
            
            for (const [symbol, expr] of bindings) {
                newEnv.define(symbol, this.eval(expr, newEnv));
            }
            
            let result = null;
            for (const expr of body) {
                result = this.eval(expr, newEnv);
            }
            return result;
        }
        
        if (first === 'q' || first === 'quote') {
            return rest[0];
        }
        
        if (first === 'macro') {
            const [name, params, body] = rest;
            const macro = {
                type: 'macro',
                params,
                body,
                env
            };
            env.define(name, macro);
            return macro;
        }
        
        // 普通函数调用
        const operator = this.eval(first, env);
        
        // 检查是否是宏
        if (operator && operator.type === 'macro') {
            const macroArgs = rest;
            const macroEnv = new Environment(operator.env);
            operator.params.forEach((param, i) => {
                macroEnv.define(param, macroArgs[i]);
            });
            
            const expanded = this.eval(operator.body, macroEnv);
            return this.eval(expanded, env);
        }
        
        // 检查是否是函数
        if (typeof operator === 'function') {
            const evaluatedArgs = rest.map(arg => this.eval(arg, env));
            return operator(...evaluatedArgs);
        }
        
        throw new Error(`${first} 不是函数或特殊形式`);
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

// 导出求值器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Environment, Evaluator };
}