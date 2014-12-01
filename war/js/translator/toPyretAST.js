// if not defined, declare the compiler object as part of plt
window.plt   = window.plt || {};
plt.compiler = plt.compiler || {};

/*
 
 BSL AST -> Pyret AST
 follows definition from XXXXX
 
 */


(function () {
    'use strict';
 
    // empty location
    var blankLoc = {"startRow": 1, "startCol": 0, "startChar": 1
                    , "endRow": 1, "endCol": 0, "endChar": 1};
 
    // convertToPyret : [listof Programs], pinfo -> JSON
    // generate pyret parse tree, preserving location information
    // follows http://www.pyret.org/docs/latest/s_program.html
    // provide and import will never be used
    function convertToPyret(programs, pinfo){
      return { name: "program"
             , kids: [ {name: "prelude"
                        , kids: []
                        , pos: blankLoc}
                      , {name: "block"
                        , kids: programs.map(function(p){return p.toPyret();})
                        , pos: programs.location.toPyret(pinfo)}]
             , pos: programs.location.toPyret()};
    }
 
    // makeLetExprFromCouple : Racket Couple -> Pyret let-expr
    // used by Let, Let*, possibly others..
    function makeLetExprFromCouple(couple){
      return {name: 'stmt'
              , kids: [{name: 'let-expr'
                       , kids: [makeBindingFromSymbol(couple.first)
                                ,{name: 'EQUALS'
                                , value: '='
                                , key: '\'EQUALS:='
                                , pos: couple.location.toPyret()}
                                ,couple.second.toPyret()]
                       , pos: couple.location.toPyret()}]
              , pos: couple.location.toPyret()};
    }
 
    // given a symbol, make a binding (used for let-expr, fun-expr, lam-expr...)
    function makeBindingFromSymbol(sym){
      var loc = sym.location.toPyret();
      return {name:'binding'
              , kids: [{name:'NAME'
                        ,value: sym.val
                        ,key:'\'NAME:'+sym.val
                        ,pos:loc}]
              , pos: loc};
    }

    // translates (f e1 e2 e3...) into (e1 f (e2 f (e3 ...)))
    // TODO: are some operators left-associative?
    function makeBinopTreeForInfixApplication(infixOperator, exprs){
      function addExprToTree(tree, expr){
        return {name:'binop-expr'
                , kids: [expr.toPyret(), infixOperator, tree]
                , pos: expr.location.toPyret()}
      }
      // starting with the firs expr, build the binop-expr tree
      var last = exprs[exprs.length-1], rest = exprs.slice(0, exprs.length-1);
      return rest.reduceRight(addExprToTree, last.toPyret());
    }
 
 
    // convert a symbol to a Pyret string or a Pyret boolean
    function makeLiteralFromSymbol(sym){
      var loc = sym.location.toPyret(), result, kid;
      if(["true", "false"].indexOf(sym.val) > -1){
        kid = (sym.val==="true")? {name:"TRUE", value:"true", key:"'TRUE:true", pos: loc}
                                  : {name:"FALSE", value:"false", key:"'FALSE", pos: loc};
        result = {name:"bool-expr", kids:[kid], pos: loc};
      } else {
        kid = {name:"STRING", value:'"'+sym.val+'"', key:"'STRING:\""+sym.val+"\"", pos:loc};
        result = {name:"string-expr", kids:[kid], pos: loc};
      }
      return {name:"expr", kids:[{name:"prim-expr", kids:[result], pos: loc}], pos: loc};
    }
 
    Vector.prototype.toPyret = function(pinfo){
      return 'types.vector(['+this.elts.join(',')+'])';
    };
    Array.prototype.toPyret = function(pinfo){
      return '[]';
    };
    // Bytecode generation for jsnums types
    jsnums.Rational.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret();
      return {name: 'frac-expr'
              , kids: [{value: this.stx
                       , key: '\'RATIONAL:'+this.stx
                       , name: 'RATIONAL'
                       , pos: this.location.toPyret()}]
              , pos: loc};
    };
    jsnums.BigInteger.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret();
      return {name: 'num-expr'
              , kids: [{value: this.stx
                       , key: '\'NUMBER:'+this.stx
                       , name: 'NUMBER'
                       , pos: loc}]
              , pos: loc};
    };
    jsnums.FloatPoint.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret();
      return {name: 'num-expr'
              , kids: [{value: this.stx
                       , key: '\'NUMBER:'+this.stx
                       , name: 'NUMBER'
                       , pos: loc}]
              , pos: loc};
    };
    jsnums.Complex.prototype.toPyret = function(pinfo){
      throw "Complex Numbers are not supported in Pyret";
    };
 
    Char.prototype.toPyret = function(pinfo){
      return 'types[\'char\'](String.fromCharCode('+this.val.charCodeAt(0)+'))';
    };
  
    Program.prototype.toPyret = function(pinfo){ throw "no toPyret() method defined"; };
    // literals
    // literal(String|Char|Number|Vector)
    // everything has a toPyret() method _except_ Strs,
    // which are a hidden datatype for some reason
    literal.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret(),
          that = this;
      function convertString(){
        return {name: "string-expr"
                , pos : loc
                , kids: [{key: '\'STRING:'+that.val.toWrittenString()
                         , name: 'STRING'
                         , value: that.val.toWrittenString()
                         , pos : loc}]};
      }
      function convertNumber(){
        return {name: "num-expr"
                , kids: [{name: 'NUMBER'
                         , value: that.val.toString()
                         , key: '\'NUMBER:'+that.val.toString()
                         , pos : loc}]
                , pos : loc};
      }
 
      var val = (that.val.toPyret)? that.val.toPyret(pinfo) :
            isNaN(this)? convertString()  :
              /* else */  convertNumber();
 
      return  {name: "check-test"
              , kids: [{name: "binop-expr"
                      , kids: [{name: "expr"
                               , kids: [{name: "prim-expr"
                                          , kids: [val]
                                          , pos: loc}]
                               , pos: loc}]
                      , pos: loc}]
              , pos: loc};
    };
 

    // Function definition
    // defFunc(name, args, body, stx)
    defFunc.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret();
      return {name:"stmt"
              , kids:[{name: "fun-expr"
                      , kids: [{name:'FUN', value:'fun', key:'\'FUN:fun', pos:this.stx[0].location.toPyret()}
                               ,{name:'fun-header'
                               , kids: [{name:'ty-params', kids:[], pos: blankLoc}
                                        ,{name:'NAME'
                                          , value: this.name.stx
                                          , key:'\'NAME:'+this.name.stx
                                          , pos: this.name.location.toPyret()}
                                        ,{name:'args'
                                          , kids: [{name:'PARENNOSPACE'
                                                    ,value:'('
                                                 ,key:'\'PARENNOSPACE:('
                                                    ,pos:this.args.location.start().toPyret()}].concat(
                                                    this.args.map(makeBindingFromSymbol)
                                                    ,[{name:'RPAREN'
                                                      ,value:')'
                                                      ,key:'\'RPAREN:)'
                                                      ,pos:this.args.location.end().toPyret()}])
                                          , pos: this.args.location.toPyret()}
                                        ,{name:'return-ann'
                                          ,kids: []
                                          ,pos:loc}]
                                , pos: this.stx[1].location.toPyret()}
                               ,{name:'COLON', value:':', key:'\'COLON::', pos: blankLoc}
                               ,{name:'doc-string', kids: [], pos: blankLoc}
                               ,{name:'block', kids: [this.body.toPyret(pinfo)], pos: this.body.location.toPyret()}
                               ,{name:'where-clause', kids:  [], pos: blankLoc}
                               ,{name:'end'
                                , kids: [{name:'END',value:'end', key:'\'END:end', pos:this.location.end()}]
                                , pos: this.location.end().toPyret()}]
                      , pos: loc}]
                , pos: loc};
    };

    // Variable definition
    // (define name expr) -> let name = expr
    // see: http://www.pyret.org/docs/latest/Statements.html#%28part._s~3alet-expr%29
    // TODO: detect toplevel declarations?
    defVar.prototype.toPyret = function(pinfo){
      return {name: 'let-expr'
              ,kids:[{name: 'let'
                      ,value:'let'
                      ,key:'\'LET:let'
                      ,pos:this.name.location.toPyret()}
                    ,{name: 'toplevel-binding'
                     ,kids:[makeBindingFromSymbol(this.name)]
                     ,pos:this.name.location.toPyret()}
                    ,{name:'EQUALS'
                      ,value:'='
                      ,key:'\'EQUALS:='
                      ,pos:this.name.location.toPyret()}].concat(this.expr.toPyret(pinfo))
              , pos: this.location.toPyret()};
    };

    // Multi-Variable definition
    // defVars(names, rhs, stx)
    // maybe wait for tuples to be implemented?
    defVars.prototype.toPyret = function(pinfo){
      return "translation of Multi-Variable Definitions is not yet implemented";
    };

    // Data Declaration
    // (define-struct foo (x y)) -> data foo: foo(x, y) end
    // see: http://www.pyret.org/docs/latest/Statements.html#%28part._s~3adata-expr%29
    defStruct.prototype.toPyret = function(pinfo){
      return {name:"stmt"
              , kids: [{name: "data-expr"
                       , kids: [{name: 'DATA'
                                  , value: 'data'
                                  , key: '\'DATA:data'
                                  , pos: this.stx[0].location.toPyret()}
                                ,{name:'ty-params'
                                  , kids: []
                                  , pos: this.stx[0].location.toPyret()}
                                , {name:'data-mixins'
                                  , kids: []
                                  , pos: this.stx[0].location.toPyret()}
                                , {name:'COLON'
                                  ,value:':'
                                  ,key:'\'COLON::'
                                  ,pos:this.stx[0].location.toPyret()}
                                , {name:'first-data-variant'
                                  ,}
                                ]
                       , pos: this.location.toPyret()}]
              , pos: this.location.toPyret()}
    };
 
    // Begin expression
    // beginExpr(exprs) -> block: exprs end
    // translates to a block: http://www.pyret.org/docs/latest/Blocks.html
    beginExpr.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret();
      // given a single expr, convert to Pyret and wrap it inside a stmt
      function makeStmtFromExpr(expr){
        return {name:'stmt'
                , kids: [expr.toPyret()]
                , pos: expr.location.toPyret()};
      }
      return {name: 'expr'
              , kids: [{name: 'user-block-expr'
                       , kids: [{name: 'BLOCK', value: 'block', key: '\'BLOCK:block', pos: loc}
                                ,{name: 'block'
                                 , kids:[this.exprs.map(makeStmtFromExpr)]
                                 , pos: this.location.toPyret()}
                                ,{name: 'end'
                                 , kids:[{name:'END',value:'end',key:'\'END:end',pos:loc}]
                                 , pos: loc}]
                       , pos: loc}]
              , pos: loc};
     };

    // Lambda expression
    // lambdaExpr(args, body) -> lam(args): body end
    lambdaExpr.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret();
      return {name: 'expr'
              , kids: [{name: 'lambda-expr'
                       , kids:[{name:'LAM', value: 'lam', key: '\'LAM:lam', pos: this.stx.location.toPyret()}
                               ,{name:'ty-params', kids:[], pos:loc}
                               ,{name:'args'
                                , kids: [{name:'PARENNOSPACE'
                                          ,value:'('
                                          ,key:'\'PARENNOSPACE:('
                                          ,pos:this.args.location.start().toPyret()}].concat(
                                          this.args.map(makeBindingFromSymbol)
                                          ,[{name:'RPAREN'
                                            ,value:')'
                                            ,key:'\'RPAREN:)'
                                            ,pos:this.args.location.end().toPyret()}])
                                , pos: this.args.location.toPyret()}
                               , {name: 'return-ann', kids: [], pos: loc}
                               , {name:'COLON', value:':', key:'\'COLON::', pos: loc}
                               , {name:'doc-string', kids:[], pos: loc}
                               , {name:'block'
                                , kids:[this.body.toPyret()]
                                , pos: this.body.location.toPyret()}
                               , {name:'where-clause', kids:[], pos: loc}
                               , {name:'end'
                                , kids:[{name:'END',value:'end',key:'\'END:end',pos:loc}]
                                , pos: loc}]
                       , pos: this.location.toPyret()}]
              , pos: loc};
    };
 
    // Local expression
    // localExpr(defns, body) -> block: defns body end
    // local gets processed a lot like begin
    // TODO: check for mutually-recursive definitions!
    localExpr.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret();
      // given a single definition, convert to Pyret and wrap it inside a stmt
      function makeStmtFromDef(def){
        return {name:'stmt'
                , kids: [def.toPyret()]
                , pos: def.location.toPyret()};
      }
      return {name: 'expr'
              , kids: [{name: 'user-block-expr'
                       , kids: [{name: 'BLOCK', value: 'block', key: '\'BLOCK:block', pos: loc}
                                ,{name: 'block'
                                 , kids:[this.defs.map(makeStmtFromDef)].concat([this.body.toPyret()])
                                 , pos: this.location.toPyret()}
                                ,{name: 'end'
                                 , kids:[{name:'END',value:'end',key:'\'END:end',pos:loc}]
                                 , pos: loc}]
                       , pos: loc}]
              , pos: loc};
    };
 
    // call expression
    // callExpr(func, args, stx)
    callExpr.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret();
      // which functions are infix?
      function getBinopForSym(sym){
        if(!(sym instanceof symbolExpr)) return false;
        var str = sym.val, loc = sym.location.toPyret();
        return (str==="+")? {name:'PLUS',   value: '+',   key: '\'PLUS: +',   pos: loc}
            : (str==="-")?  {name:'DASH',   value: '-',   key: '\'DASH: -',   pos: loc}
            : (str==="*")?  {name:'STAR',   value: '*',   key: '\'STAR: *',   pos: loc}
            : (str==="/")?  {name:'SLASH',  value: '-',   key: '\'SLASH: /',  pos: loc}
            : (str===">")?  {name:'GT',     value: '>',   key: '\'GT: >',     pos: loc}
            : (str==="<")?  {name:'LT',     value: '<',   key: '\'LT: -',     pos: loc}
            : (str===">=")? {name:'GEQ',    value: '>=',  key: 'GEQ: >=',     pos: loc}
            : (str==="<=")? {name:'LEQ',    value: '<=',  key: 'LEQ: <=',     pos: loc}
            : (str==="=")?  {name:'EQUALEQUAL', value: '==', key: '\'EQUALEQUAL: -', pos: loc}
            : false; // if the function isn't a binop, return false
      }

      // if the function is infix in Pyret, return the binop tree instead of a call-expr
      var infixOperator = getBinopForSym(this.func);
      if(infixOperator){
        return makeBinopTreeForInfixApplication(infixOperator, this.args);
      } else {
        return {name:'app-expr'
                , kids: [{name: 'expr'
                          , kids: [{name: 'id-expr'
                                  , kids: [{name: 'NAME'
                                           , value: this.func.val
                                           , key: '\'NAME:'+this.func.val
                                           , pos: this.func.location.toPyret(pinfo)}]
                                  , pos: this.func.location.toPyret()}]
                          , pos: this.func.location.toPyret()}
                         ,{name: 'app-args'
                                  , kids: [{name: 'PARENNOSPACE'
                                            , value: '('
                                            , key: '\'PARENNOSPACE:('
                                            , pos: this.location.start().toPyret()}].concat(
                                           this.args.map(function(p){return p.toPyret(pinfo)}))
                                  , pos: this.func.location.toPyret()}]
              , pos: loc}
      }
    };

    // if expression maps to if-expr
    // see: http://www.pyret.org/docs/latest/Expressions.html#%28part._s~3aif-expr%29
    ifExpr.prototype.toPyret = function(pinfo){
       return {name: 'if-expr'
              , kids: [{name:'IF'
                        ,value:'if'
                        ,key:'\'IF:if'
                        ,pos:this.stx.location.toPyret()}
                       ,this.predicate.toPyret(pinfo)
                       ,{name:'COLON'
                        ,value:':'
                        ,key:'\'COLON::'
                        ,pos:this.stx.location.toPyret()}
                       ,{name:'block'
                        ,kids:[{name:'stmt'
                               , kids:[this.consequence.toPyret(pinfo)]
                               , pos: this.consequence.location.toPyret()}]
                        ,pos: this.consequence.location.toPyret()}
                       ,{name:'ELSECOLON'
                        ,value:'else:'
                        ,key:'\'ELSECOLON:else:'
                        ,pos:this.stx.location.toPyret()}
                       ,{name:'block'
                        ,kids:[{name:'stmt'
                               , kids:[this.alternative.toPyret(pinfo)]
                               , pos: this.alternative.location.toPyret()}]
                        ,pos: this.alternative.location.toPyret()}
                       ,{name:'end'
                        ,kids:[{name:'END'
                                ,value:'end'
                                ,key:'\'END:end'
                                ,pos: this.location.end().toPyret()}]
                        ,pos:this.location.end().toPyret()}]
              , pos: this.location.toPyret()};
    };

    // when(pred, expr) translates to when(pred, expr)
    // unless(pred, expr) translates to when(not(pred), expr)
    // see: http://www.pyret.org/docs/latest/A_Tour_of_Pyret.html#%28part._.When_blocks%29
    // TODO: do we need to wrap the expr in a block?
    whenUnlessExpr.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret();
 
      // if it's "unless", change the predicate to not(pred) in racket
      if(this.stx.val==="unless"){
        var notFn = new symbolExpr("not"),
            notCall = new callExpr(notFn, [this.predicate]);
        notFn.location = notCall.location = this.predicate.location;
        this.predicate = notCall;
      }
 
      return {name: 'when-expr'
              , kids:[{name:'WHEN', value:'when', key:'\'WHEN:when', pos: this.stx.location.toPyret()}
                      ,this.predicate.toPyret()
                      ,{name:'COLON', value:':', key:'\'COLON::', pos:loc}
                      ,this.exprs.toPyret()
                      ,{name:'end'
                        ,kids:[{name:'END'
                                ,value:'end'
                                ,key:'\'END:end'
                                ,pos: this.location.end().toPyret()}]
                        ,pos:this.location.end().toPyret()}]
              , pos: loc};
    };
 
    // letrec becomes letrec
    letrecExpr.prototype.toPyret = function(pinfo){
      return "translation of letrec expressions is not yet implemented";
    };
 
    // let -> blockful of let-exprs, BUT...
    // in order to preserve semantics, we introduce temporary identifiers:
    // (let [(a 5) (b a)] b) -> block: a_1 = 5 b_1 = a a = a_1 b = b_1 b end
    // then we can safely convert
    letExpr.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret();
      var tmpIDs = [],
          // bind the rhs to lhs_tmp
          tmpBindings = this.bindings.map(function(c){
                                            var tmpSym = new symbolExpr(c.first.val+"_tmp"),
                                                tmpBinding = new couple(tmpSym, c.second);
                                            tmpSym.location = c.first.location;
                                            tmpBinding.location = c.location;
                                            tmpIDs.push(tmpSym);
                                            return tmpBinding;
                                          }),
          // bind lhs_tmp to lhs
          newBindings = this.bindings.map(function(c, i){
                                            var c2 = new couple(c.first, tmpIDs[i]);
                                            c2.location = c.location;
                                            return c2;
                                          }),
          stmts = tmpBindings.concat(newBindings).map(makeLetExprFromCouple);
      stmts.push(this.body.toPyret());
      return {name: 'expr'
              , kids: [{name: 'user-block-expr'
                       , kids: [{name: 'BLOCK', value: 'block', key: '\'BLOCK:block', pos: loc}
                                ,{name: 'block'
                                 , kids: stmts
                                 , pos: this.location.toPyret()}
                                ,{name: 'end'
                                 , kids:[{name:'END',value:'end',key:'\'END:end',pos:loc}]
                                 , pos: loc}]
                       , pos: loc}]
              , pos: loc};

    };

    // let* becomes a simple blockful of let-exprs
    // see: http://www.pyret.org/docs/latest/Statements.html#%28part._s~3alet-expr%29
    letStarExpr.prototype.toPyret = function(){
      var loc = this.location.toPyret();
      return {name: 'expr'
              , kids: [{name: 'user-block-expr'
                       , kids: [{name: 'BLOCK', value: 'block', key: '\'BLOCK:block', pos: loc}
                                ,{name: 'block'
                                 , kids:this.bindings.map(makeLetExprFromCouple).push(this.body.toPyret())
                                 , pos: this.location.toPyret()}
                                ,{name: 'end'
                                 , kids:[{name:'END',value:'end',key:'\'END:end',pos:loc}]
                                 , pos: loc}]
                       , pos: loc}]
              , pos: loc};
    };

    // cond -> ask
    // see: http://www.pyret.org/docs/latest/Expressions.html#%28part._s~3aask-expr%29
    condExpr.prototype.toPyret = function(pinfo){
      return "translation of cond expressions is not yet implemented";
    };

    // case -> cases
    // see: http://www.pyret.org/docs/latest/Expressions.html#%28part._s~3acases-expr%29
    caseExpr.prototype.toPyret = function(pinfo){
      return "translation of case expressions is not yet implemented";
    };

    // and -> and
    // convert to nested, binary ands
    andExpr.prototype.toPyret = function(pinfo){
      var loc = this.stx.location.toPyret(),
          infixOperator = {name:'AND', value: 'and', key: 'AND:and', pos: loc};
      return makeBinopTreeForInfixApplication(infixOperator, this.exprs);
    };

    // or -> or
    // convert to nested, binary ors
    orExpr.prototype.toPyret = function(pinfo){
      var loc = this.stx.location.toPyret(),
          infixOperator = {name:'OR', value: 'or', key: 'OR:or', pos: loc};
      return makeBinopTreeForInfixApplication(infixOperator, this.exprs);
    };


    /*  
        Pyret lacks any notion of quoting, 
        so this is a *partially-supported approximation*!!!
     
        quasiquoted expressions could be desugared into mostly-valid
        expressions, but cond, case, and & or would desugar into invalid
        code. Therefore, we throw errors for everything but quoated 
        expressions, and we translate those using loose Pyret equivalents
     */
 
    // quoted literals translate to themselves
    // quoted symbols translate to strings
    // quoted lists evaluate to lists
    quotedExpr.prototype.toPyret = function(pinfo){
      if(this.val instanceof literal){
        return this.val.toPyret();
      } else if(this.val instanceof symbolExpr){
        return makeLiteralFromSymbol(this.val);
      } else if (this.val instanceof Array){
        return makeListFromArray(this.val);
      } else {
        throw "There is no translation for "+this.toString();
      }
    };

    // we need to find a way to desugar these
    unquotedExpr.prototype.toPyret = function(pinfo){
      throw "IMPOSSIBLE: unquoted expressions should be desugared away";
    };

    unquoteSplice.prototype.toPyret = function(pinfo){
      throw "IMPOSSIBLE: unquote-splace expressions should be desugared away";
    };

    quasiquotedExpr.prototype.toPyret = function(pinfo){
      throw "IMPOSSIBLE: quasiquoted expressions should be desugared away";
    };

    // symbol expression
    // symbolExpr(val)
    symbolExpr.prototype.toPyret = function(pinfo){
      var loc = this.location.toPyret();
      return {name: 'check-test'
             , kids: [{name: 'binop-expr'
                      , kids: [{name: 'expr'
                               , kids: [{name: 'id-expr'
                                        , kids: [{name: 'NAME'
                                                 , value: this.val
                                                 , key: '\'NAME:'+this.val
                                                 , pos: loc}]
                                        , pos: loc}]
                               , pos: loc}]
                      , pos: loc}]
             , pos: loc};
    };
 
    /////////////////////
    /* Export Bindings */
    /////////////////////
    plt.compiler.toPyretAST = convertToPyret;
})();
