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

// ==================== 独立的宏展开器 ====================
class MacroExpander {
    constructor() {
        this.debugLevel = 0;
    }

    log(level, ...args) {
        if (this.debugLevel >= level) {
            console.log(...args);
        }
    }

    expandMacro(macro, args) {
        this.log(2, `展开宏开始`);
        this.log(2, `宏参数模式: ${JSON.stringify(macro.params)}`);
        this.log(2, `实际参数: ${JSON.stringify(args)}`);
        
        const { body, params } = macro;
        
        // 收集宏体中所有解引用的符号
        const referencedSymbols = this.collectReferencedSymbols(body);
        this.log(2, `宏体引用的符号: ${Array.from(referencedSymbols).join(', ')}`);
        
        // 绑定参数
        this.log(2, `绑定参数...`);
        const paramMap = this.bindMacroParameters(params, args, referencedSymbols);
        this.log(2, `参数绑定结果: ${JSON.stringify(paramMap)}`);
        
        // 展开宏体
        this.log(2, `展开宏体...`);
        const expanded = this.expandMacroBody(body, paramMap);
        this.log(2, `宏体展开结果: ${JSON.stringify(expanded)}`);
        
        return expanded;
    }
    
    collectReferencedSymbols(expr) {
        const symbols = new Set();
        
        const collect = (expr) => {
            if (typeof expr === 'string') {
                // 检查是否以 ~ 或 ~@ 开头
                if (expr.startsWith('~@')) {
                    symbols.add(expr.slice(2));
                } else if (expr.startsWith('~')) {
                    symbols.add(expr.slice(1));
                }
                return;
            }
            
            if (!Array.isArray(expr)) {
                return;
            }
            
            for (const item of expr) {
                collect(item);
            }
        };
        
        collect(expr);
        return symbols;
    }
    
    bindMacroParameters(paramPattern, args, referencedSymbols) {
        this.log(3, `绑定参数: pattern=${JSON.stringify(paramPattern)}, args=${JSON.stringify(args)}`);
        const paramMap = {};
        
        let patternIndex = 0;
        let argIndex = 0;
        const patternLen = paramPattern.length;
        const argLen = args.length;
        
        while (patternIndex < patternLen && argIndex < argLen) {
            const patternElem = paramPattern[patternIndex];
            this.log(3, `  处理模式元素[${patternIndex}]: ${JSON.stringify(patternElem)}`);
            
            // 处理 & 参数（可变参数）
            if (patternElem === '&') {
                if (patternIndex + 1 >= patternLen) {
                    throw new Error('& 后面需要参数名');
                }
                
                const restParam = paramPattern[patternIndex + 1];
                this.log(3, `  找到可变参数: ${restParam}`);
                patternIndex += 2;
                
                const restArgs = args.slice(argIndex);
                this.log(3, `  剩余参数: ${JSON.stringify(restArgs)}`);
                
                if (referencedSymbols.has(restParam)) {
                    paramMap[restParam] = restArgs;
                    this.log(3, `  绑定可变参数 ${restParam} = ${JSON.stringify(restArgs)}`);
                } else {
                    this.log(3, `  可变参数 ${restParam} 未被引用，不绑定`);
                }
                
                argIndex = argLen;
                continue;
            }
            
            const argElem = args[argIndex];
            this.log(3, `  对应实参[${argIndex}]: ${JSON.stringify(argElem)}`);
            
            if (Array.isArray(patternElem)) {
                if (!Array.isArray(argElem)) {
                    throw new Error(`期望列表参数，实际: ${argElem}`);
                }
                
                const nestedMap = this.bindMacroParameters(patternElem, argElem, referencedSymbols);
                Object.assign(paramMap, nestedMap);
                this.log(3, `  嵌套绑定结果: ${JSON.stringify(nestedMap)}`);
            } else if (typeof patternElem === 'string') {
                if (referencedSymbols.has(patternElem)) {
                    paramMap[patternElem] = argElem;
                    this.log(3, `  绑定参数 ${patternElem} = ${JSON.stringify(argElem)}`);
                } else {
                    this.log(3, `  检查关键字: ${patternElem} == ${argElem}?`);
                    if (patternElem !== argElem) {
                        throw new Error(`关键字不匹配: 期望 ${patternElem}, 实际 ${argElem}`);
                    }
                    this.log(3, `  关键字匹配: ${patternElem}`);
                }
            } else {
                if (patternElem !== argElem) {
                    throw new Error(`模式不匹配: 期望 ${patternElem}, 实际 ${argElem}`);
                }
            }
            
            patternIndex++;
            argIndex++;
        }
        
        this.log(3, `绑定完成，paramMap: ${JSON.stringify(paramMap)}`);
        return paramMap;
    }
    
    expandMacroBody(expr, paramMap, depth = 0) {
        const indent = '  '.repeat(depth);
        this.log(3, `${indent}展开宏体: ${JSON.stringify(expr)}`);
        
        if (typeof expr === 'string') {
            if (expr.startsWith('~@')) {
                const paramName = expr.slice(2);
                this.log(3, `${indent}处理 ~@${paramName}`);
                const value = paramMap[paramName];
                if (value === undefined) {
                    return expr;
                }
                
                this.log(3, `${indent}~@${paramName} 的值: ${JSON.stringify(value)}`);
                
                if (Array.isArray(value)) {
                    return { _type: 'splice', value: value };
                }
                return value;
            }
            
            if (expr.startsWith('~')) {
                const paramName = expr.slice(1);
                this.log(3, `${indent}处理 ~${paramName}`);
                const value = paramMap[paramName];
                if (value === undefined) {
                    return expr;
                }
                this.log(3, `${indent}~${paramName} -> ${JSON.stringify(value)}`);
                return value;
            }
            
            this.log(3, `${indent}普通字符串: ${expr}`);
            return expr;
        }
        
        if (!Array.isArray(expr)) {
            this.log(3, `${indent}非列表值: ${expr}`);
            return expr;
        }
        
        // 处理 q/quote
        if (expr[0] === 'q' || expr[0] === 'quote') {
            const quotedExpr = expr[1];
            this.log(3, `${indent}处理 q: ${JSON.stringify(quotedExpr)}`);
            
            const expandedQuoted = this.expandQuotedInQ(quotedExpr, paramMap, depth + 1);
            this.log(3, `${indent}q 展开结果: ${JSON.stringify([expr[0], expandedQuoted])}`);
            return [expr[0], expandedQuoted];
        }
        
        this.log(3, `${indent}处理列表: ${expr.length} 个元素`);
        const result = [];
        
        for (let i = 0; i < expr.length; i++) {
            const item = expr[i];
            this.log(3, `${indent}元素[${i}]: ${JSON.stringify(item)}`);
            
            const expanded = this.expandMacroBody(item, paramMap, depth + 1);
            this.log(3, `${indent}元素[${i}] 展开后: ${JSON.stringify(expanded)}`);
            
            if (expanded && expanded._type === 'splice') {
                const spliceValue = expanded.value;
                this.log(3, `${indent}处理 splice: ${JSON.stringify(spliceValue)}`);
                
                if (Array.isArray(spliceValue)) {
                    for (const elem of spliceValue) {
                        result.push(elem);
                    }
                } else {
                    result.push(spliceValue);
                }
            } else {
                result.push(expanded);
            }
        }
        
        this.log(3, `${indent}列表展开结果: ${JSON.stringify(result)}`);
        return result;
    }

    expandQuotedInQ(expr, paramMap, depth = 0) {
        const indent = '  '.repeat(depth);
        this.log(3, `${indent}expandQuotedInQ: ${JSON.stringify(expr)}`);
        
        if (typeof expr === 'string') {
            if (expr.startsWith('~@')) {
                const paramName = expr.slice(2);
                const value = paramMap[paramName];
                if (value === undefined) {
                    return expr;
                }
                this.log(3, `${indent}~@${paramName} -> ${JSON.stringify(value)}`);
                return { _type: 'q-splice', value };
            }
            
            if (expr.startsWith('~')) {
                const paramName = expr.slice(1);
                const value = paramMap[paramName];
                if (value === undefined) {
                    return expr;
                }
                this.log(3, `${indent}~${paramName} -> ${JSON.stringify(value)}`);
                return value;
            }
            
            return expr;
        }
        
        if (!Array.isArray(expr)) {
            return expr;
        }
        
        const result = [];
        for (let i = 0; i < expr.length; i++) {
            const item = expr[i];
            const expanded = this.expandQuotedInQ(item, paramMap, depth + 1);
            
            if (expanded && expanded._type === 'q-splice') {
                const spliceValue = expanded.value;
                if (Array.isArray(spliceValue)) {
                    for (const elem of spliceValue) {
                        result.push(elem);
                    }
                } else {
                    result.push(spliceValue);
                }
            } else {
                result.push(expanded);
            }
        }
        
        return result;
    }
}

// ==================== 求值器 ====================
class Evaluator {
    constructor() {
        this.globalEnv = this.createGlobalEnvironment();
        this.macroExpander = new MacroExpander();
        this.debugLevel = 0;
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
        env.define('string?', (x) => typeof x === 'string' );
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

    eval(expr, env = this.globalEnv, depth = 0) {
        const indent = '  '.repeat(depth);
        this.log(3, `${indent}eval: ${JSON.stringify(expr)}`);
        
        // 处理原子值
        if (typeof expr === 'number') {
            this.log(3, `${indent}-> number: ${expr}`);
            return expr;
        }
        if (typeof expr === 'boolean') {
            this.log(3, `${indent}-> boolean: ${expr}`);
            return expr;
        }
        if (expr === null) {
            this.log(3, `${indent}-> null`);
            return null;
        }
        
        if (typeof expr === 'string' ) {
            if(expr.startsWith('"') && expr.endsWith('"')){
                const str = expr.slice(1, -1);
                this.log(3, `${indent}-> string: "${str}"`);
                return str;
            }
            else {
                const value = env.get(expr);
                this.log(3, `${indent}-> symbol ${expr}: ${typeof value === 'function' ? '[function]' : JSON.stringify(value)}`);
                return value;
            }
        }
       
        // 处理列表
        if (!Array.isArray(expr) || expr.length === 0) {
            this.log(3, `${indent}-> non-list or empty: ${expr}`);
            return expr;
        }
        
        const [first, ...rest] = expr;
        this.log(2, `${indent}列表: ${JSON.stringify(first)} ${rest.length > 0 ? '...' : ''}`);
        
        // 特殊处理symbol?
        if (first === 'symbol?') {
            const [arg] = rest;
            const result = typeof arg === 'string' && !arg.startsWith('"') && !arg.endsWith('"');
            this.log(2, `${indent}symbol? ${arg} -> ${result}`);
            return result;
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
        
        if (first === 'q' || first === 'quote') {
            const quoted = rest[0];
            this.log(2, `${indent}quote -> ${JSON.stringify(quoted)}`);
            return quoted;
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
        
        if (first === 'macro') {
            const [name, params, body] = rest;
            this.log(1, `${indent}定义宏: ${name} ${JSON.stringify(params)}`);
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
        this.log(3, `${indent}调用: ${first}`);
        const operator = this.eval(first, env, depth + 1);
        
        // 检查是否是宏
        if (operator && operator.type === 'macro') {
            this.log(1, `${indent}展开宏: ${first}`);
            this.log(2, `${indent}宏参数: ${JSON.stringify(rest)}`);
            const macroArgs = rest;
            
            // 使用宏展开器展开宏
            const expanded = this.macroExpander.expandMacro(operator, macroArgs);
            this.log(1, `${indent}宏 ${first} 展开结果: ${JSON.stringify(expanded)}`);
            
            // 关键修复：应该返回整个展开结果，不是 expanded[1]
            return this.eval(expanded, env, depth + 1);
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

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Environment, Evaluator, MacroExpander };
}