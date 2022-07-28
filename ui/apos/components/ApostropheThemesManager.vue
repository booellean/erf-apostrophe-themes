<template>
    <apos-modal
        :modal="modal"
        :modal-title="{
          key: 'Manage Themes',
          type: 'themes'
        }"
        @inactive="modal.active = false"
        @show-modal="modal.showModal = true"
        @esc="modal.showModal = false"
        @no-modal="$emit('safe-close')"
    >
        <template #secondaryControls>
            <apos-button
                type="default" label="apostrophe:exit"
                @click="modal.showModal = false"
            />
        </template>
        <template #primaryControls>
            <div>
                <apos-button
                    v-if="moduleTypes.length === 1"
                    :disabled="(isEditing || confirmingThemeType)"
                    type="primary"
                    icon="plus-icon"
                    label="New Theme"
                    :modifiers="['no-motion']"
                    @click="openThemeForm()"
                />
                <apos-context-menu
                    v-else-if="moduleTypes.length > 0"
                    :disabled="(isEditing || confirmingThemeType)"
                    class="apos-admin-bar_context-button"
                    :menu="typesMenu"
                    menu-placement="bottom-end"
                    @item-clicked="openThemeForm"
                    :button="{
                        tooltip: { content: 'apostrophe:moreOptions', placement: 'bottom' },
                        label: 'New Theme',
                        icon: 'plus-icon',
                        type: 'primary',
                        modifiers: ['no-motion']
                    }"
                />
            </div>
        </template>
        <template #main>
            <apos-modal-body>
                <template #bodyHeader>
                    <apos-modal-toolbar>
                        <template #rightControls>
                            <apos-pager
                                v-if="totalPages > 1"
                                @click="updatePage"
                                @change="updatePage"
                                :total-pages="totalPages"
                                :current-page="currentPage"
                            />
                        </template>
                    </apos-modal-toolbar>
                </template>
                <template #bodyMain>
                    <aside id="erf-palette">
                        <apostrophe-themes-edit
                            v-if="isEditing"
                            :theme-type="themeType"
                            :theme-object="themeConfig"
                            :current-theme="currentTheme"
                            :schema="moduleOptions.schema"
                            :formSchema="moduleSchemas[themeType]"
                            :module-get-css="moduleGetCss"
                            @save-theme="saveTheme"
                            @save-draft="saveDraft"
                            @cancel-theme="cancelTheme"
                        />
                        <div v-else-if="items.length > 0">
                            <apostrophe-themes-list
                                :items="items"
                                @edit-item="editTheme"
                                @copy-item="copyTheme"
                                @delete-item="deleteTheme"
                                @discard-draft="discardThemeDraft"
                            />
                        </div>
                        <!-- TODO: Watch this language, give actual instructions -->
                        <div v-else>There are no themes available. Please start by clicking "New Theme +" to create a new theme.</div>
                    </aside>
                </template>
            </apos-modal-body>
        </template>
    </apos-modal>
</template>

<script>
import ApostropheThemesEdit from './ApostropheThemesEdit'
import ApostropheThemesList from './ApostropheThemesList'
import AposButton from 'apostrophe/modules/@apostrophecms/ui/ui/apos/components/AposButton'
import AposContextMenu from 'apostrophe/modules/@apostrophecms/ui/ui/apos/components/AposContextMenu'
import AposModal from 'apostrophe/modules/@apostrophecms/modal/ui/apos/components/AposModal'
import AposModalBody from 'apostrophe/modules/@apostrophecms/modal/ui/apos/components/AposModalBody'
import AposModalToolbar from 'apostrophe/modules/@apostrophecms/modal/ui/apos/components/AposModalToolbar'
import AposPager from 'apostrophe/modules/@apostrophecms/ui/ui/apos/components/AposPager'

export default {
    emits: [ 'safe-close', 'archive', 'save' ],
    components: {
        AposButton,
        AposContextMenu,
        AposModal,
        AposModalBody,
        AposModalToolbar,
        AposPager,
        ApostropheThemesEdit,
        ApostropheThemesList
    },
    props: {
        moduleName: {
            type: String,
            required: true
        },
        moduleFields: {
            type: Object,
            required: true
        },
        moduleTypes: {
            type: Array,
            required: true
        },
        moduleGetThemes: {
            type: String,
            required: true
        },
        moduleGetCss: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            moduleOptions: window.apos.modules[this.moduleName],
            moduleSchemas: window.apos.modules[this.moduleName].schemas,
            modal: {
                active: false,
                type: 'slide',
                showModal: false,
                width: 'one-third'
            },
            typesMenu: this.$props.moduleTypes.map( type => ({ label: type, action: type })),
            themeType: '',
            themeConfig: {},
            currentTheme: {},
            currentIndex: null,
            currentPage: 1,
            totalPages: 1,
            perPage: 1,
            isEditing: false,
            confirmingThemeType: false,
            items: []
        }
    },
    async mounted() {
        this.modal.active = true;
        console.log('props...', this.$props, this.$data)
        await this.getThemes();
        window.apos.bus.$on('content-changed', this.onContentChanged);
    },
    beforeDestroy() {
        this.modal.active = false;
    },
    destroyed() {
        apos.bus.$off('content-changed', this.onContentChanged);
    },
    methods: {
        async getThemes() {
            const apiResponse = await apos.http.get( this.moduleGetThemes, {
                busy: true,
                qs: { page: this.currentPage }
            });

            let metaData = apiResponse.metadata[0]
            this.currentPage = metaData.page;
            this.perPage = metaData.perPage;
            this.totalPages = Math.ceil(metaData.total/metaData.perPage);
            this.items = apiResponse.items;
        },
        async onContentChanged() {
            // TODO: freeze this until editing is done...?
            console.log('the content changed')
            await this.getThemes();
        },
        editTheme(theme, index){
            this.currentIndex = index;
            this.currentTheme = theme.doc;
            return this.openThemeForm(this.currentTheme.themeType)
        },
        copyTheme(theme){
            let copyTheme = {...theme.doc}
            // Remove the identifying ids so we save a new theme
            copyTheme._id = null
            copyTheme.aposDocId = null
            // Default Copy should not be activated
            copyTheme.activaged = false
            // In case a user wasn't focusing on the title, makes it easier for them to remember which is which
            copyTheme.title = copyTheme.title + ' copy'
            this.currentTheme = copyTheme;
            return this.openThemeForm(this.currentTheme.themeType)
        },
        async discardThemeDraft(theme, index){
            try{
                let doc = await apos.http.get(`${this.moduleOptions.action}/${theme.doc.aposDocId}`, {
                    busy: true,
                    draft: false
                })

                if(doc._id){
                    try{
                        // We are going to PATCH the doc to make it more up to date. Simpler than deleting the draft
                        doc = await apos.http.patch(`${this.moduleOptions.action}/${doc._id}`, {
                            body: { title: doc.title },
                            busy: true
                        })

                        // Verify that Patch was successful
                        if(doc._id){
                            doc = this.transformDoc(doc)
                            return this.items.splice(index, 1, doc)
                        }

                        throw Error('no id')

                    }catch(e){
                        return window.apos.notify('An error occurred while discarding the theme. Please contact IT.', {
                            type: 'danger',
                            icon: 'alert-circle-icon'
                        })
                    }
                }

                throw Error('no id')

            }catch(e){
                window.apos.notify('This theme does not have a published version.', {
                    type: 'warning',
                    icon: 'alert-circle-icon'
                })
            }
        },
        openThemeForm(themeType = null){
            console.log('opening', themeType)
            if(!themeType) themeType = this.$props.moduleTypes[0]
            if(this.$props.moduleTypes.indexOf(themeType) < 0) {
                return window.apos.notify('Properties for theme were not found. Please contact your IT provider.', {
                    type: 'danger',
                    icon: 'alert-circle-icon'
                })
            }
            this.confirmingThemeType = false
            
            this.themeConfig = this.$props.moduleFields[themeType]
            this.themeType = themeType;
            this.isEditing = true;
        },
        saveDraft(themeType, themeObject, themeTitle, themeActivated){
            return this.saveTheme(themeType, themeObject, themeTitle, themeActivated, true)
        },
        async saveTheme(themeType, themeObject, themeTitle, themeActivated, draft = false){
            let postType, urlAddition;

            // We have to do a little bit of weird logic to account for drafts...
            if(!this.currentTheme._id){
                postType = 'post'
                urlAddition = ''
            }else if(this.currentTheme.aposMode === 'draft' && !draft){
                postType = 'post'
                urlAddition = `/${this.currentTheme._id}/publish`
            }else if((this.currentTheme.aposMode === 'draft' && draft) || (this.currentTheme.aposMode === 'published' && !draft)){
                postType = 'patch'
                urlAddition = `/${this.currentTheme._id}`
            }else if(this.currentTheme.aposMode === 'published' && draft){
                let draftItem = await apos.http.get(`${this.moduleOptions.action}/${this.currentTheme.aposDocId}`, { draft: draft })
                if(draftItem){
                    postType = 'patch'
                    urlAddition = `/${draftItem._id}`
                }else{
                    postType = 'post'
                    urlAddition = ''
                }
            }

            let doc = await apos.http[postType](this.moduleOptions.action + urlAddition, {
                busy: true,
                body: {
                    title: themeTitle,
                    themeType: themeType,
                    activated: themeActivated,
                    themeObject: themeObject
                },
                draft: draft
            })

            // Not sure if this was the intended apostrophe behavior, but the published type is not being returned.
            if(this.currentTheme.aposMode === 'draft' && !draft){
                let publishedItem = await apos.http.get(`${this.moduleOptions.action}/${this.currentTheme.aposDocId}`, { draft: false })
                doc = publishedItem
            }

            // Transform the data to match our aggregate pattern
            doc = this.transformDoc(doc)
            
            if(!this.currentTheme._id){
                this.items.splice(0,0,doc)
            }else if(this.currentIndex > -1){
                this.items.splice(this.currentIndex, 1, doc)
            }

            if(!draft) this.resetCss()

            // Reset Values
            this.cancelTheme()
        },
        updatePage(pageNum){
            this.currentPage = pageNum
            this.getThemes()
        },
        deleteTheme(theme, index){
            let isDraft = theme.doc.aposMode === 'draft'
            let docId = theme.doc.aposDocId
            return apos.http.delete(`${this.moduleOptions.action}/${theme.doc._id}`, { draft: isDraft })
                .then( res => {
                    this.items.splice(index, 1)
                    return res;
                })
                .then( res => {
                    // If we deleted a published document, we need to delete the draft as well
                    if(!isDraft){
                        return apos.http.delete(`${this.moduleOptions.action}/${docId}`, { draft: true })
                            .then( res => {
                                return window.apos.notify('Theme was successfully deleted', {
                                    type: 'success',
                                    icon: 'alert-circle-icon',
                                    dismiss: true,
                                })
                            })
                            .catch( err => {
                                // There was no published document, we are good
                            })
                    }else{
                        return window.apos.notify('Theme was successfully deleted', {
                            type: 'success',
                            icon: 'alert-circle-icon',
                            dismiss: true,
                        })
                    }
                })
                .catch( err => {
                    console.log('error', err)
                    return window.apos.notify('The theme failed to be deleted. Please contact IT.', {
                        type: 'error',
                        icon: 'alert-circle-icon'
                    })
                })

            // Reset Everything
            this.cancelTheme()
        },
        cancelTheme(){
            // Reset Everything
            this.currentTheme = {}
            this.currentIndex = null
            this.isEditing = false
        },
        resetCss(){
            let oldTag = document.querySelector('link#erf-themes-css')
            if(oldTag){
                let url = oldTag.getAttribute('href');
                let newTag = document.createElement('link')
                newTag.setAttribute('href', url)
                newTag.setAttribute('rel', 'stylesheet')
                newTag.setAttribute('id', 'erf-themes-css')
                let head = oldTag.parentNode
                head.replaceChild(newTag, oldTag)
            }
        },
        transformDoc(doc){
            return { _id : doc._id, doc: doc }
        }
    }
}
</script>

<style>
    #erf-palette {
        overflow: auto;
        height: auto;
        z-index: 2000;
    }
    .apos-button--success {
        border: 1px solid var(--a-success) !important;
        color: var(--a-white) !important;
        background-color: var(--a-success) !important;
    }
    .apos-button--success:hover {
        background-color: var(--a-success) !important;
    }
    .apos-button--success:active,
    .apos-button--success.apos-is-active {
        background-color: var(--a-success) !important;
    }
    .apos-button--success:focus {
        box-shadow: 0 0 0 1px var(--a-base-7),
            0 0 0 3px var(--a-success) !important;
    }
    .apos-button--success[disabled] {
        border: 1px solid var(--a-success) !important;
        color: var(--a-white) !important;
        background-color: var(--a-success-fade) !important;
    }
    .apos-button--success[disabled].apos-button--busy {
        border: 1px solid var(--a-success) !important;
    }
    .apos-button--success .apos-spinner__svg {
        color: var(--a-success) !important;
    }
</style>