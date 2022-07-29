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
      writeCssFile: false,
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
            return { cssData : self.cssData }
          },
          async js(req, data) {
            return {
                themes: self.shorthandThemes
            }
          },
          async themeSwitches(req, data){
            return {
                themes: data.types ? self.shorthandThemes.filter( obj => data.types.indexOf(obj.type) > -1) : self.shorthandThemes,
                includeTitle: (data.includeTitle !== undefined ? data.includeTitle : true),
                // TODO: make more widget types!
                widget: data.widgetType || 'tabs'
            }
          }
        }
    },
    beforeSuperClass(self) {
        // Set default options
        if(self.options.writeCssFile){
            let dir = path.resolve(process.cwd(), 'public', self.options.cssDirectory)
            // Make directory if it doesn't exist
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            self.options.cssFile = path.resolve('/', self.options.cssDirectory, self.options.cssFileName+'.css')
            self.options.writeDirectory = dir
        }

        // Set activeThemes in case app is resetting
        self.options.moduleTypes = Object.keys(self.options.themes)
        self.activeThemes = [];
        self.shorthandThemes = [];
        self.cssData = ''

    },
    async init(self){
        // self.apos.template.append('body', 'erf-apostrophe-themes:js');
        // TODO: remove after test
        self.apos.template.append('body', 'erf-apostrophe-themes:themeSwitches');
        self.apos.template.prepend('head', 'erf-apostrophe-themes:css');

        self.activeThemes = await self.getCurrentThemes()
        self.shorthandThemes = self.getShorthandThemes(self.activeThemes)
        self.cssData = self.writeDataAsCss(self.activeThemes)
    },
    handlers(self){
        return {
            '@apostrophecms/page:beforeSend': {
                async addDataAndAttributeToBody(req) {
                  // Add themes as a data attribute on the body tag
                  // TODO: what? The admin bar uses this to stay open if configured by the user
                  try {
                    let themes = self.activeThemes;

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
                        let activeThemes = await self.find(req, {}).criteria({ activated: true }).toArray()
                            
                        // Write Css file
                        let data = self.writeDataAsCss(activeThemes)
                        if(self.options.writeCssFile) self.writeCssFile(data, self.options.cssFileName)

                        // Update our constant
                        self.activeThemes = activeThemes
                        self.shorthandThemes = self.getShorthandThemes(activeThemes)
                        self.cssData = data
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
            async getCurrentThemes(){
                let criteria = {
                    aposMode: 'published',
                    activated: true,
                    type: 'erf-apostrophe-themes',
                    aposLocale: {
                        // Only interested in valid draft locales
                        $in: Object.keys(self.apos.i18n.locales).map(locale => `${locale}:published`)
                    }
                }
                return await self.apos.doc.db.find(criteria).toArray()
            },
            getShorthandThemes(themes){
                return themes.map( theme => ({ categories : Object.keys(theme.themeObject), type: theme.themeType, title: theme.title }))
            },
            writeColors(value, type, amount){
                return Color(value)[type](amount).hex()
                // TODO: conform color value 
            },
            writeDataAsCss(themeArray){
                let data = '';
                let defaultData = '';
                for(let i = 0; i < themeArray.length; i++){
                    let theme = themeArray[i]
                    // light, dark, whatever names assigned
                    let themeCategories = Object.keys(theme.themeObject)
            
                    for(let j = 0; j < themeCategories.length; j++){
                        let category = themeCategories[j]
                        let safeType = theme.themeType.toLowerCase().replaceAll(' ', '')
                        // colors, sizes, etc
                        let themeVariables = Object.keys(theme.themeObject[category])
                        if(category !== 'default'){
                            data += `
                            .themes-${safeType}-${category}, body[data-theme-${safeType}="${category}"] {
                            `
                        }
            
                        for(let k = 0; k < themeVariables.length; k++){
                            let varName = themeVariables[k] 
                            let variable = theme.themeObject[category][varName]
                            let schema = self.schemas[theme.themeType].find( s => s.name === varName)
                            let value = variable.value && variable.value.data ? variable.value.data : (variable.def ? variable.def : '')
                            let templateVal = value;
                            let newItem = ''
                            // TODO: test
                            if(value){
                                if(schema.templateFunc){
                                    if(self.options.templates[schema.templateFunc]){
                                        newItem += self.options.templates[schema.templateFunc](templateVal, schema.variable)
                                    }
                                }
                                else if(schema.template){
                                    if(Array.isArray(value) && schema.join){
                                        let conjoined = value.join(schema.join)
                                        templateVal = schema.template.replace(`$VAR`, conjoined)
                                    }else if(schema.type === 'color' && (schema.lighten || schema.darken)){
                                        const colorLoop = (type) => {
                                            let amount = schema[`${type}Step`] || schema.step || (.9 / schema[type])
                                            for(let l = 0; l < schema[type]; l++){
                                                let colorVal = self.writeColors(templateVal, type, amount*(l+1))
                                                newItem += `
                                                    --${schema.variable}${schema[`${type}Postfix`] ? '-'+schema[`${type}Postfix`]  : ''}-${l+1}: ${colorVal};
                                                `
                                            }
                                        }
                                        if(schema.lighten) colorLoop('lighten')
                                        if(schema.darken) colorLoop('darken')
                                        // We are going to write the base val after these for loops
                                        templateVal = schema.template.replace('$VAR', templateVal)
                                    }else{
                                        templateVal = schema.template.replace('$VAR', templateVal)
                                    }

                                    newItem += `--${schema.variable}: ${templateVal};`
                                }

                                if(newItem.length > 0){
                                    if(category === 'default'){
                                        defaultData += newItem
                                    }else{
                                        data += newItem
                                    }
                                }
                            }
                        }
                        data +=`
                            }
                        `
                    }
                }

                if(defaultData.length > 0){
                    defaultData = `
                    :root {
                        ${defaultData}
                    }
                    `
                    data = defaultData + data
                }

                return data;
            },
            writeCssFile(data, cssFileName){
                fs.writeFile(`${self.options.writeDirectory}/${cssFileName}.css`, data, (err) => {
                    if (err)  console.log(err);
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