const fs = require('fs');
const path = require('path');
const sanitize = require('mongo-sanitize');
const Color = require('color')

// TODO: This will control the ui for the admin bar too....
module.exports = {
    extend: '@apostrophecms/piece-type',
    options: {
      name: 'erf-apostrophe-themes',
      label: 'Theme',
      pluralLabel: 'Themes',
      icon: 'palette-icon',
      alias: 'theme',
      searchable: false,
      autopublish: true,
      editRole: 'editor',
      publishRole: 'editor',
      quickCreate: false,
      perPage: 15,
      publicApiProjection: {},
      setDefaults: true,
      cssDefaultsName: 'erf-themes-defaults',
      cssFileName: 'erf-themes',
      cssDirectory: 'css'
    },
    fields: {
        remove: [ 'slug', 'visibility' ],
        add: {
            activated: {
                label: 'Active',
                type: 'boolean',
                toggle: true,
                def: false,
                help: 'If this is active, your users will be able to toggle between theme definitions, such as "light" and "dark" mode.'
            },
            themeType: {
                label: 'Type',
                type: 'string',
                required: true,
                readonly: true,
            }
        },
        group: {
            basics: {
              label: 'Basics',
              fields: [ 'title', 'themeType', 'activated' ]
            }
        }
    },
    components(self) {
        return {
          async css(req, data) {
            let dataObj = { erfThemesCssUrl : self.options.cssFile }
            if(self.options.setDefaults) dataObj.cssThemesDefaultsUrl = path.resolve('/', self.options.cssDirectory, self.options.cssDefaultsName+'.css')
            return dataObj
          },
          async js(req, data) {},
          async themeSwitches(req, data){
            return {
                themes: await self.getCurrentThemes(req, data.themeType),
                includeTitle: data.includeTitle || true,
                // TODO: make more widget types!
                widget: data.widgetType || 'tabs'
            }
          }
        }
    },
    beforeSuperClass(self) {
        let dir = path.resolve(process.cwd(), 'public', self.options.cssDirectory)
        // Make directory if it doesn't exist
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        self.options.cssFile = path.resolve('/', self.options.cssDirectory, self.options.cssFileName+'.css')
        self.options.writeDirectory = dir
        self.options.moduleTypes = Object.keys(self.options.themes)
    },
    init(self){
        if(self.options.setDefaults) self.setDefaultTheme()

        self.apos.template.append('body', 'erf-apostrophe-themes:js');
        // TODO: remove after test
        self.apos.template.append('body', 'erf-apostrophe-themes:themeSwitches');
        self.apos.template.prepend('head', 'erf-apostrophe-themes:css');
    },
    handlers(self){
        return {
            '@apostrophecms/page:beforeSend': {
                async addDataAndAttributeToBody(req) {
                  // Add themes as a data attribute on the body tag
                  // TODO: what? The admin bar uses this to stay open if configured by the user
                  try {
                    let themes = await self.getCurrentThemes(req, 'all')

                    for(let i = 0; i < themes.length; i++){
                        let theme = themes[i]
                        let type = theme.themeType.toLowerCase().replaceAll(' ', '')
                        let category;
                        let dataObj = {};
                        // fastest way to get first value
                        for(let cat in theme.themeObject){
                            category = cat;
                            break;
                        }
                        dataObj[`theme-${type}`] = category

                        self.apos.template.addBodyClass(req, `themes-${type}-${category}`)
                        self.apos.template.addBodyDataAttribute(req, dataObj)
                    }
                  }catch(e){
                    self.apos.util.warn(`Please contact IT. ${e.message}`);
                  }
                }
            },
            'beforeSave': {
                addThemeContent(req, doc){
                    let themeObj = req.body.themeObject
                    if(themeObj){
                        let sanitizedObj = sanitize(themeObj);
                        doc.themeObject = sanitizedObj
                    }
                }
            },
            'afterSave': {
                async deactivateThemes(req, doc){
                    // If a live theme was changed
                    if(doc.aposMode === 'published' && doc.activated === true){
                        await self.apos.doc.db.updateMany({
                            themeType : doc.themeType,
                            aposMode : 'published',
                            type : self.__meta.name,
                            archived : false,
                            aposDocId : { $ne : doc.aposDocId },
                        }, { $set: { activated: false } })
                    }
                },
                async writeThemesToFile(req, doc){
                    // If a live theme was changed
                    if(doc.aposMode === 'published' && doc.activated === true){
                        let active = await self.find(req, {}).criteria({ activated: true }).toArray()
                            
                        // Write Css file
                        let data = self.writeDataAsCss(active)
                        self.writeCssFile(data, self.options.cssFileName)
                    }
                }
            }
        }
    },
    extendMethods(self) {
        return {
          getBrowserData(_super, req) {
            const data = _super(req);
            data.components.managerModal = 'ApostropheThemesManager';
            data.components.editorModal = 'ApostropheThemesManager';
            data.schemas = self.schemas;
            return data;
          },
          composeSchema(_super) {
            _super();
            let themes = self.options.moduleTypes
            let schemas = {}
            for(let i = 0; i < themes.length; i++){
                let theme = themes[i]
                schemas[theme] = self.apos.schema.compose({
                    addFields: self.apos.schema.fieldsToArray(`Module ${self.__meta.name}`, self.options.themes[theme].fields.add),
                    arrangeFields: self.apos.schema.groupsToArray(self.options.themes[theme].fieldsGroups)
                  }, self);
            }
            self.schemas = schemas;
          }
        };
    },
    methods(self) {
        return {
            addManagerModal() {
                self.apos.modal.add(
                    `${self.__meta.name}:manager`,
                    self.getComponentName('managerModal', 'ApostropheThemesManager'),
                    {
                        moduleName: self.__meta.name,
                        moduleFields: self.options.themes,
                        moduleTypes: self.options.moduleTypes,
                        moduleGetThemes : '/api/v1/erf-apostrophe-themes-view',
                        moduleGetCss: '/api/v1/erf-apostrophe-themes-get-css'
                    }
                );
            },
            async getCurrentThemes(req, themeType = 'all'){
                let query = self.find(req, {})
                let criteria = { aposMode: 'published', activated: true }
                if(themeType == 'all'){
                    return await query.criteria(criteria).toArray()
                }else{
                    // TODO: check if this works
                    criteria.themeType = themeType
                    return await query.criteria(criteria).toArray()
                }
            },
            writeColors(value, type, amount){
                return Color(value)[type](amount).hex()
                // TODO: conform color value 
            },
            writeDataAsCss(themeArray){
                let data = '';
                for(let i = 0; i < themeArray.length; i++){
                    let theme = themeArray[i]
                    // light, dark, whatever names assigned
                    let themeCategories = Object.keys(theme.themeObject)
            
                    for(let j = 0; j < themeCategories.length; j++){
                        let category = themeCategories[j]
                        let safeType = theme.themeType.toLowerCase().replaceAll(' ', '')
                        // colors, sizes, etc
                        let themeVariables = Object.keys(theme.themeObject[category])
                        if(category === 'default'){
                            data += `
                            :root {
                        `
                        }else{
                            data += `
                            .themes-${safeType}-${category}, body[data-theme-${safeType}="${category}"] {
                        `
                        }
            
                        for(let k = 0; k < themeVariables.length; k++){
                            let varName = themeVariables[k] 
                            let variable = theme.themeObject[category][varName]
                            let value = variable.value && variable.value.data ? variable.value.data : (variable.def || '')
                            let templateVal = value;
                            // TODO: test
                            if(variable.templateFunc){
                                if(self.options.templates[variable.templateFunc]){
                                    data += self.options.templates[variable.templateFunc](templateVal, variable.variable)
                                    continue;
                                }
                            }
                            else if(variable.template){
                                if(Array.isArray(value)){
                                    for(let l = 1; l < value.length; l++){
                                        let field = value[l]
                                        let val = field.value.data ? field.value.data : (field.def || '')
                                        templateVal = variable.template.replace(`$VAR${l+1}`, val)
                                    }
                                }else if(variable.type === 'color' && (variable.lighten || variable.darken)){
                                    const colorLoop = (type) => {
                                        let amount = variable[`${type}Step`] || variable.step || (.9 / variable[type])
                                        for(let l = 0; l < variable[type]; l++){
                                            let colorVal = self.writeColors(templateVal, type, amount*(l+1))
                                            data += `
                                                --${variable.variable}${variable[`${type}Postfix`] ? '-'+variable[`${type}Postfix`]  : ''}-${l+1}: ${colorVal};
                                            `
                                        }
                                    }
                                    if(variable.lighten){
                                        colorLoop('lighten')
                                    }
                                    if(variable.darken){
                                        colorLoop('darken')
                                    }
                                    // We are going to write the base val after these for loops
                                    templateVal = variable.template.replace('$VAR', templateVal)
                                }else{
                                    templateVal = variable.template.replace('$VAR', templateVal)
                                }

                                data += `--${variable.variable}: ${templateVal};`
                            }
            
                        }
                        data +=`
                            }
                        `
                    }
                }
                return data;
            },
            setDefaultTheme(){
                let themeArr = []
                for(let i = 0; i < self.options.moduleTypes.length; i++){
                    let themeType = self.options.moduleTypes[i]
                    themeArr.push({
                        themeType: themeType,
                        themeObject: {
                            default: self.options.themes[themeType].fields.add
                        }
                    })
                }
                // Write Css file
                let data = self.writeDataAsCss(themeArr)
                self.writeCssFile(data, self.options.cssDefaultsName)
            },
            writeCssFile(data, cssFileName){
                fs.writeFile(`${self.options.writeDirectory}/${cssFileName}.css`, data, (err) => {
                    if (err)
                        // TODO, handle this... apos.warn?
                      console.log(err);
                    else {
                      console.log("File written successfully\n");
                    }
                });
            }
        }
    },
    apiRoutes(self) {
        return {
          get: {
            '/api/v1/erf-apostrophe-themes-view' : async function (req, res) {
                let pageNum = req.query.page;
                let perPage = self.options.perPage || '30'

                let items = await self.apos.doc.db
                .aggregate([
                    {
                        $match:
                        {
                           type : self.__meta.name,
                           archived: false
                        }
                    },
                    { $sort: { 'updatedAt': -1 } },
                    {
                        $group: {
                            _id : "$aposDocId",
                            doc : { $first: "$$ROOT" }
                        }
                    },
                    { '$facet' : {
                        metadata: [ { $count: "total" }, { $addFields: { page: Math.ceil(pageNum), perPage: Math.ceil(perPage) } } ],
                        items: [ { $sort: { 'doc.title': 1 } },{ $skip: ((pageNum-1)*perPage) }, { $limit: perPage } ]
                    }},
                ])
                .toArray()

                // TODO: Object appears to be circular unless toArray is called. Too tired to figure that one out
                return items[0];
            }
          },
          post: {
            '/api/v1/erf-apostrophe-themes-get-css' : async function (req, res) {
                // TODO: sanitize
                let themeArr = req.body.theme
                let cssBody = self.writeDataAsCss(themeArr)
                return cssBody
            }
          }
        }
    }
}