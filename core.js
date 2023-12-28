const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const types = require("@babel/types");
const generator = require("@babel/generator").default;
const fs = require('fs')
const {Utils} = require('./utils')
let jscode = fs.readFileSync(Utils.inputFile, {
    encoding: "utf-8"
})

var keyWords = [];
function buildReferenceMap(ast) {
    const referenceMap = {};
    traverse(ast, {
        VariableDeclaration: {
            enter(path) {
                const declarations = path.node.declarations;
                declarations.forEach(decl => {
                    if (decl.init && decl.init.type === 'Identifier') {
                        referenceMap[decl.id.name] = decl.init.name;
                    }
                });
            }
        }
    });
    return referenceMap;
}

function referencesTarget(variableName, referenceMap) {
    let currentName = variableName;
    while (currentName) {
        if (currentName === Utils.coreVarName) {
            return true;
        }
        currentName = referenceMap[currentName];
    }
    return false;
}

function replace_list_to_string2(path, referenceMap) {
    const node = path.node;
    if (!node.declarations || node.declarations.length === 0) {
        return;
    }

    node.declarations.forEach(declaration => {
        if (declaration.id && declaration.id.type === 'Identifier' &&
            referencesTarget(declaration.id.name, referenceMap)) {
            keyWords.push(declaration.id.name);
        }
    });
}

function traverse_all_MemberExpression(ast) {
    const referenceMap = buildReferenceMap(ast);
    console.info("编译开始");
    traverse(ast, {
        VariableDeclaration: {
            enter(path) {
                replace_list_to_string2(path, referenceMap);
            }
        }
    });

    traverse(ast, {
        CallExpression: {
            enter: [replace_list_to_string]
        }
    });
    console.info("编译完成");
}

function replace_list_to_string(path) {
    const node = path.node;
    if (!keyWords.includes(node.callee.name)) {
        return;
    }
    let first_arg = node.arguments[0].value;
    let value = Utils.coreFun(first_arg);
    path.replaceWith(types.StringLiteral(value))
}

let ast = parser.parse(jscode);
traverse_all_MemberExpression(ast);
let {
    code
} = generator(ast);
fs.writeFile(Utils.outputFile, code, err => {})