// evaluator.js - 完整版本，包含模式匹配宏支持
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
        
        if (first === 'while') {
            const [test, ...body] = rest;
            let result = null;
            
            while (this.eval(test, env)) {
                for (const expr of body) {
                    result = this.eval(expr, env);
                }
            }
            
            return result;
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
            
            // 展开宏
            const expanded = this.expandMacro(operator, macroArgs);
            
            // 求值展开后的表达式
            return this.eval(expanded, env);
        }
        
        // 检查是否是函数
        if (typeof operator === 'function') {
            const evaluatedArgs = rest.map(arg => this.eval(arg, env));
            return operator(...evaluatedArgs);
        }
        
        throw new Error(`${first} 不是函数或特殊形式`);
    }

    // ==================== 模式匹配宏展开核心 ====================
    
    expandMacro(macro, args) {
        const { body, params } = macro;
        
        // 创建参数映射
        const paramMap = {};
        
        // 绑定参数（支持模式匹配）
        if (!this.bindParamsWithPattern(params, args, paramMap)) {
            throw new Error(`宏参数模式匹配失败，期望: ${JSON.stringify(params)}，实际: ${JSON.stringify(args)}`);
        }
        
        // 展开宏体
        return this.expandMacroBody(body, paramMap);
    }

    bindParamsWithPattern(params, args, paramMap, startParamIndex = 0, startArgIndex = 0) {
        let paramIndex = startParamIndex;
        let argIndex = startArgIndex;
        const paramLen = params.length;
        const argLen = args.length;
        
        while (paramIndex < paramLen && argIndex < argLen) {
            const param = params[paramIndex];
            const arg = args[argIndex];
            
            // 处理 & 参数（可变参数）
            if (param === '&') {
                if (paramIndex + 1 >= paramLen) {
                    throw new Error('& 后面需要参数名');
                }
                const restParam = params[paramIndex + 1];
                // 收集剩余的所有参数
                paramMap[restParam] = args.slice(argIndex);
                return true; // 成功绑定
            }
            
            // 处理模式匹配参数（如 [a to b]）
            if (Array.isArray(param)) {
                if (!this.matchPattern(param, arg, paramMap)) {
                    return false; // 模式匹配失败
                }
                paramIndex++;
                argIndex++;
                continue;
            }
            
            // 普通参数绑定
            paramMap[param] = arg;
            paramIndex++;
            argIndex++;
        }
        
        // 检查是否所有参数都已处理
        if (paramIndex < paramLen) {
            // 还有参数未处理
            // 检查是否是 & 参数
            if (params[paramIndex] === '&' && paramIndex + 1 < paramLen) {
                // & 参数可以处理零个参数
                const restParam = params[paramIndex + 1];
                paramMap[restParam] = []; // 空列表
                return true;
            }
            return false; // 还有必需参数未提供
        }
        
        // 检查是否还有未使用的参数
        if (argIndex < argLen) {
            // 还有参数未使用
            // 检查前面是否有 & 参数
            for (let i = 0; i < paramIndex; i++) {
                if (params[i] === '&') {
                    // & 参数应该已经处理了所有剩余参数
                    // 如果到这里还有剩余，说明有问题
                    return false;
                }
            }
            // 没有 & 参数，但有多余参数，不允许
            return false;
        }
        
        return true;
    }

    matchPattern(pattern, arg, paramMap) {
        // 模式必须是列表
        if (!Array.isArray(pattern)) {
            throw new Error('模式必须是列表');
        }
        
        // 参数必须是列表
        if (!Array.isArray(arg)) {
            console.log('模式匹配失败: 参数不是列表', pattern, arg);
            return false;
        }
        
        // 检查长度匹配
        if (pattern.length !== arg.length) {
            console.log('模式匹配失败: 长度不匹配', pattern.length, arg.length);
            return false;
        }
        
        // 逐个元素匹配
        for (let i = 0; i < pattern.length; i++) {
            const patternElem = pattern[i];
            const argElem = arg[i];
            
            if (typeof patternElem === 'string') {
                // 判断是变量还是关键字
                if (this.isVariableName(patternElem)) {
                    // 变量：绑定值
                    paramMap[patternElem] = argElem;
                } else {
                    // 关键字：必须精确匹配
                    if (patternElem !== argElem) {
                        console.log('关键字不匹配:', patternElem, argElem);
                        return false;
                    }
                }
            } else if (Array.isArray(patternElem)) {
                // 嵌套模式：递归匹配
                if (!this.matchPattern(patternElem, argElem, paramMap)) {
                    return false;
                }
            } else {
                // 其他类型：必须精确匹配
                if (patternElem !== argElem) {
                    return false;
                }
            }
        }
        
        return true;
    }

    isVariableName(name) {
        if (typeof name !== 'string') return false;
        // 变量名规则：
        // 1. 不能是数字开头
        // 2. 不能包含特殊字符
        // 3. 不能是保留关键字
        const reserved = ['&', '~', '~@', 'q', 'quote', 'def', 'set', 'fn', 'if', 'cond', 'do', 'let', 'while', 'macro'];
        if (reserved.includes(name)) return false;
        if (/^\d/.test(name)) return false;
        if (/[\[\]\{\}\(\)\s,;]/.test(name)) return false;
        return true;
    }

    expandMacroBody(expr, paramMap) {
        // 处理字符串（符号）
        if (typeof expr === 'string') {
            // 处理 ~@symbol（拼接）
            if (expr.startsWith('~@')) {
                const paramName = expr.slice(2);
                if (paramMap[paramName] !== undefined) {
                    const value = paramMap[paramName];
                    // 标记为拼接操作
                    return { _type: 'splice', value };
                }
                return expr;
            }
            
            // 处理 ~symbol（普通替换）
            if (expr.startsWith('~')) {
                const paramName = expr.slice(1);
                if (paramMap[paramName] !== undefined) {
                    return paramMap[paramName];
                }
                return expr;
            }
            
            return expr;
        }
        
        // 处理非列表值
        if (!Array.isArray(expr)) {
            return expr;
        }
        
        // 处理 q/quote
        if (expr[0] === 'q' || expr[0] === 'quote') {
            const quotedExpr = expr[1];
            const expanded = this.expandQuoted(quotedExpr, paramMap);
            return expanded;
        }
        
        // 递归处理列表
        const result = [];
        for (const item of expr) {
            const expanded = this.expandMacroBody(item, paramMap);
            
            // 处理拼接
            if (expanded && expanded._type === 'splice') {
                const spliceValue = expanded.value;
                if (Array.isArray(spliceValue)) {
                    // 如果是数组，展开所有元素
                    result.push(...spliceValue);
                } else {
                    // 否则直接添加
                    result.push(spliceValue);
                }
            } else {
                result.push(expanded);
            }
        }
        
        return result;
    }

    expandQuoted(expr, paramMap) {
        // 处理字符串（符号）
        if (typeof expr === 'string') {
            // 处理 ~@symbol（拼接）
            if (expr.startsWith('~@')) {
                const paramName = expr.slice(2);
                if (paramMap[paramName] !== undefined) {
                    const value = paramMap[paramName];
                    // 标记为拼接操作
                    return { _type: 'splice', value };
                }
                return expr;
            }
            
            // 处理 ~symbol（普通替换）
            if (expr.startsWith('~')) {
                const paramName = expr.slice(1);
                if (paramMap[paramName] !== undefined) {
                    return paramMap[paramName];
                }
                return expr;
            }
            
            return expr;
        }
        
        // 处理非列表值
        if (!Array.isArray(expr)) {
            return expr;
        }
        
        // 递归处理列表
        const result = [];
        for (const item of expr) {
            const expanded = this.expandQuoted(item, paramMap);
            
            // 处理拼接
            if (expanded && expanded._type === 'splice') {
                const spliceValue = expanded.value;
                if (Array.isArray(spliceValue)) {
                    // 如果是数组，展开所有元素
                    result.push(...spliceValue);
                } else {
                    // 否则直接添加
                    result.push(spliceValue);
                }
            } else {
                result.push(expanded);
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

// 导出求值器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Environment, Evaluator };
}