import path from 'node:path'
import ts from 'typescript'
import { builtinModules } from 'node:module'
import { defineConfig } from 'tsdown/config'

export default defineConfig({
  entry: {
    index: 'src/main.ts',
    'main-cli': 'src/main-cli.ts',
  },
  outExtensions: (context) => {
    if (context.format === 'es') {
      return {
        js: '.mjs',
        dts: '.d.ts',
      }
    }

    return { js: '.js', dts: '.d.ts' }
  },
  dts: {
    resolve: true,
    resolver: 'tsc',
    build: true,
  },
  format: ['esm'],
  shims: true,
  target: 'node18',
  platform: 'node',
  sourcemap: false,
  outDir: 'dist',
  clean: true,
  external: [
    ...builtinModules,
    ...builtinModules.map((node) => `node:${node}`),
  ],
  outputOptions (outputOptions) {
    outputOptions.advancedChunks = {
      includeDependenciesRecursively: true,
      groups: [
        {
          // 按包名分组
          name (id) {
            if (id.includes('node_modules')) {
              const pkg = getPackageName(id)
              /** 文件名称 不包含后缀 */
              const name = path.basename(id, path.extname(id))
              return `chunks/${pkg}/${name}`
            }
            return null
          },

          // 匹配 node_modules 下所有模块
          test: /node_modules[\\/]/,

          priority: 1,

          // 每个包最大 100KB，超过会拆成 2 个、1 个...
          maxSize: 50 * 1024,

          // 单模块也不能超过 100 KB
          maxModuleSize: 100 * 1024,

          // 必须为 0，否则太小的 chunk 会被默认逻辑吞掉
          minSize: 0,
        },
      ],
    }

    return outputOptions
  },
  plugins: [
    removeDebugPlugin(),
  ],
})

/**
 * 移除 debug 模块的导入和所有调用（使用 TypeScript Compiler API）
 */
function removeDebugPlugin (): any {
  return {
    name: 'remove-debug',
    enforce: 'pre',

    transform (code: string, id: string) {
      // 只处理 TypeScript/JavaScript 文件
      if (!/\.[tj]sx?$/.test(id)) return null

      // 快速检查
      if (!code.includes('debug') && !code.includes('DEBUG')) return null

      // 解析为 AST
      const sourceFile = ts.createSourceFile(
        id,
        code,
        ts.ScriptTarget.Latest,
        true,
        id.endsWith('.tsx') || id.endsWith('.jsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
      )

      const debugIdentifiers = new Set<string>()
      let modified = false

      // 转换函数
      const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
        return (sourceFile) => {
          const visitor = (node: ts.Node): ts.Node | undefined => {
            // 1. 移除 debug 模块的导入
            if (ts.isImportDeclaration(node)) {
              const moduleSpecifier = node.moduleSpecifier
              if (ts.isStringLiteral(moduleSpecifier) && moduleSpecifier.text === 'debug') {
                // 记录导入的标识符
                if (node.importClause?.name) {
                  debugIdentifiers.add(node.importClause.name.text)
                }
                modified = true
                return undefined // 移除节点
              }
            }

            // 2. 移除 debug 实例创建的变量声明
            if (ts.isVariableStatement(node)) {
              const declarations = node.declarationList.declarations.filter(decl => {
                if (decl.initializer && ts.isCallExpression(decl.initializer)) {
                  const callee = decl.initializer.expression
                  if (ts.isIdentifier(callee) && debugIdentifiers.has(callee.text)) {
                    // 记录新的 debug 实例名称
                    if (ts.isIdentifier(decl.name)) {
                      debugIdentifiers.add(decl.name.text)
                    }
                    modified = true
                    return false // 过滤掉这个声明
                  }
                }
                return true
              })

              if (declarations.length === 0) {
                return undefined // 移除整个语句
              }

              if (declarations.length < node.declarationList.declarations.length) {
                return ts.factory.updateVariableStatement(
                  node,
                  node.modifiers,
                  ts.factory.updateVariableDeclarationList(
                    node.declarationList,
                    declarations
                  )
                )
              }
            }

            // 3. 移除 debug 函数调用的表达式语句
            if (ts.isExpressionStatement(node)) {
              const expr = node.expression
              if (ts.isCallExpression(expr)) {
                const callee = expr.expression
                if (ts.isIdentifier(callee) && debugIdentifiers.has(callee.text)) {
                  modified = true
                  return undefined // 移除节点
                }
              }
            }

            // 4. 移除 export { debug } 或 export { debug as something }
            if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
              const elements = node.exportClause.elements.filter(elem => {
                const name = elem.propertyName?.text || elem.name.text
                if (debugIdentifiers.has(name)) {
                  modified = true
                  return false
                }
                return true
              })

              // 所有 export 都被移除 → 删除整条 export 语句
              if (elements.length === 0) {
                return undefined
              }

              // 更新 export 语句
              return ts.factory.updateExportDeclaration(
                node,
                node.modifiers,
                false,
                ts.factory.updateNamedExports(node.exportClause, elements),
                node.moduleSpecifier,
                node.assertClause
              )
            }

            return ts.visitEachChild(node, visitor, context)
          }

          return ts.visitNode(sourceFile, visitor) as ts.SourceFile
        }
      }

      // 应用转换
      const result = ts.transform(sourceFile, [transformer])
      const transformedSourceFile = result.transformed[0]

      if (!modified) {
        result.dispose()
        return null
      }

      // 生成代码
      const printer = ts.createPrinter({
        newLine: ts.NewLineKind.LineFeed,
        removeComments: false,
      })

      const output = printer.printFile(transformedSourceFile)
      result.dispose()

      return {
        code: output,
        map: null,
      }
    },
  }
}

const getPackageName = (filePath: string): string | null => {
  // 格式化为绝对路径
  const absPath = path.resolve(filePath).replace(/\\/g, '/')

  const idx = absPath.lastIndexOf('node_modules/')
  if (idx === -1) return null

  const suffix = absPath.slice(idx + 13)
  const parts = suffix.split('/').filter(Boolean)

  if (parts.length === 0) return null

  // 组织包 (@scope/package)
  if (parts[0].startsWith('@')) {
    return parts.length > 1 ? `${parts[0]}/${parts[1]}` : null
  }

  // 普通包
  return parts[0]
}
