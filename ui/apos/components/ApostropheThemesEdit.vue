<template>
    <section>
        <div role="form" v-if="!categoryIsEditing">
            <ul id="erf-theme-edit-list">
                <li>
                    <apos-input-string
                        v-model="titleName"
                        :field="schema.find( field => field.name === 'title') || { type: 'text', required: true, label: 'Nickname' }"
                    />
                </li>
                <li>
                    <apos-input-boolean
                        v-model="activated"
                        :field="schema.find( field => field.name === 'activated') || { type: 'boolean', required: true, label: 'Activated' }"
                    />
                </li>
                <li>
                    <div class="apos-field__wrapper">
                        <div class="apos-field">
                            <div class="apos-field__info">
                                <label class="apos-field__label">Theme Categories</label>
                                <apos-button
                                    @click.prevent="addCategory"
                                    label='New Theme Category'
                                    icon='plus-icon'
                                    type='primary'
                                    :modifiers="['small', 'no-motion']"
                                />
                            </div>
                            <ul>
                                <li
                                    v-for="(data, category) in categories"
                                    :key="'themes-category-'+category"
                                >
                                    <span>{{category}}</span>
                                    <apos-button-group>
                                        <apos-button
                                            label="edit"
                                            type="subtle"
                                            @click.prevent="editCategory(category)"
                                        />
                                        <apos-button
                                            label="copy"
                                            type="subtle"
                                            @click.prevent="copyCategory(category)"
                                        />
                                        <apos-button
                                            label="delete"
                                            type="subtle"
                                            @click.prevent="deleteCategory(category)"
                                        />
                                    </apos-button-group>
                                </li>
                            </ul>
                        </div>
                    </div>
                </li>
            </ul>
            <apos-button
                label="Save" type="default"
                @click.prevent="saveTheme('save-theme')"
                :modifiers="[ 'success' ]"
            />
            <apos-button
                label="Save Draft" type="default"
                @click.prevent="saveTheme('save-draft')"
            />
            <apos-button
                label="Cancel" type="default"
                @click.prevent="cancelTheme"
                :modifiers="[ 'danger' ]"
            />
        </div>
        <apostrophe-themes-form role="form" v-if="categoryIsEditing"
            :category="currentCategory"
            :current-theme="editObject"
            :edit-groups="editGroups"
            :schema="formSchema"
            @input-change="updateFields"
        >
            <template #buttons>
                <apos-button
                    label="Save" type="default"
                    @click.prevent="saveCategory"
                    :modifiers="[ 'success' ]"
                />
                <apos-button
                    label="Cancel" type="default"
                    @click.prevent="cancelCategory"
                    :modifiers="[ 'danger' ]"
                />
            </template>
        </apostrophe-themes-form>
    </section>
</template>

<script>
import AposButton from 'apostrophe/modules/@apostrophecms/ui/ui/apos/components/AposButton'
import AposButtonGroup from 'apostrophe/modules/@apostrophecms/ui/ui/apos/components/AposButtonGroup'
import AposInputBoolean from 'apostrophe/modules/@apostrophecms/schema/ui/apos/components/AposInputBoolean'
import AposInputString from 'apostrophe/modules/@apostrophecms/schema/ui/apos/components/AposInputString'
import ApostropheThemesForm from './ApostropheThemesForm'

export default {
    name: 'ApostropheThemesEdit',
    components: { AposButton, AposButtonGroup, AposInputBoolean, AposInputString, ApostropheThemesForm },
    emits: [ 'save-theme', 'save-draft', 'cancel-theme' ],
    props: {
        themeType: {
            type: String,
            required: true
        },
        currentTheme: {
            type: Object,
            required: false,
            default: () => {}
        },
        schema: {
            type: Array,
            required: true
        },
        formSchema : {
            type: Array,
            required: true
        },
        themeObject: {
            type: Object,
            required: true
        },
        moduleGetCss: {
            type: String,
            required: true
        }
    },
    data() {
        // elements used for live updating
        let styleTag = document.createElement('style')
        let bodyTag = document.querySelector('body')
        let bodyData = {...bodyTag.dataSet}
        let bodyClasses = body.className

        return {
            // We destructure here to avoid Vue mutating the props object
            categories: { ...(this.$props.currentTheme.themeObject ? this.$props.currentTheme.themeObject : {}) },
            categoryIsEditing: false,
            currentCategory: '',
            categoryClickedOriginalName: '',
            titleName: { data: this.$props.currentTheme.title || '' },
            activated: { data: this.$props.currentTheme.activated || false },
            editObject: this.$props.themeObject.fields.add,
            editGroups: this.$props.themeObject.group || {
                basics: {
                    label: 'Basics',
                    fields: Object.keys(this.$props.themeObject.fields.add)
                }
            },
            pending: null,
            styleTag: styleTag,
            bodyTag: bodyTag,
            bodyData: bodyData,
            bodyClasses: bodyClasses
        }
    },
    mounted(){
        console.log('form',this.$props, this.$data)
        // Get active styles link tag, or the title tag if one doesn't exist yet.
        let activeStyles = document.querySelector('style#erf-themes-css') || document.querySelector('title')
        activeStyles.parentNode.insertBefore(this.$data.styleTag, activeStyles.nextSibling);
    },
    beforeDestroy(){
        // Remove the styleTag
        this.resetBody()
        this.styleTag.parentNode.removeChild(this.styleTag)
    },
    methods: {
        editCategory(category = ''){
            console.log('categories',this.categories, this.$props.themeObject)
            this.currentCategory = category;
            this.categoryClickedOriginalName = category;
            this.editObject = { ...(this.categories[category] ? this.categories[category] : this.$props.themeObject.fields.add)}

            this.updatePreviewStyles()

            this.categoryIsEditing = true;
        },
        copyCategory(category) {
            this.editObject = { ...(this.categories[category] ? this.categories[category] : this.$props.themeObject.fields.add)}
            this.currentCategory = category+'-copy';
            this.categoryIsEditing = true;
        },
        addCategory() {
            this.editCategory()
        },
        deleteCategory(category) {
            if(this.categories[category]){
                this.categories[category] = null
                delete this.categories[category]
            }
        },
        saveCategory(){
            if(this.currentCategory.length < 1){
                // TODO
                return alert('Please enter a name for this category (such as "light")')
            }
            if(this.categories[this.currentCategory] && this.currentCategory !== this.categoryClickedOriginalName){
                return alert('This name is already in use. Please enter a unique name for this category')
            }
            // If this category's name is what's being edited
            else if(this.categoryClickedOriginalName.length > 0){
                delete this.categories[this.categoryClickedOriginalName]
            }
            this.categoryIsEditing = false;

            // This was updating in our "updateFields" method
            this.categories[this.currentCategory] = this.editObject;
            this.currentCategory = '';
            this.categoryClickedOriginalName = '';
            this.resetBody()
        },
        cancelCategory(){
            this.categoryIsEditing = false;
            this.currentCategory = '';
            this.styleTag.innerHTML = '';
            this.resetBody()
        },
        saveTheme(emitType){
            this.$emit(emitType, this.$props.themeType, this.$data.categories, this.$data.titleName.data, this.$data.activated.data)
        },
        cancelTheme(){
            this.$emit('cancel-theme')
        },
        updateFields(category, fields){
            this.currentCategory = category;
            this.editObject = fields;
            // We are reseting the pending timeout since most likely a user is still editing the field
            if (this.pending) {
                clearTimeout(this.pending);
                this.pending = null;
            }
            this.pending = setTimeout(() => {
                this.continueFieldsUpdate();
            }, 300);
        },
        continueFieldsUpdate(){
            if (this.pending) {
                clearTimeout(this.pending);
                this.pending = null;
            }
            this.updatePreviewStyles()
        },
        resetBody() {
            // Reset the dataset values of the body tag
            this.bodyTag.className = this.bodyClasses;
            for(let set in this.bodyTag.dataset){
                this.bodyData[set] ?
                    this.bodyTag.dataset[set] = this.bodyData[set] :
                    delete this.bodyTag.dataset[set]
            }
        },
        async updatePreviewStyles(){
            let themeName = this.currentCategory ? this.currentCategory : 'empty'
            let themeArr = [{
                themeType: this.$props.themeType,
                themeObject: {
                    [themeName] : { ...this.editObject }
                }
            }]

            try{
                let cssData = await apos.http.post(this.$props.moduleGetCss, {
                    busy: true,
                    body: { theme: themeArr }
                })
                this.styleTag.innerHTML = cssData;
                window.apos.util.widgetPlayers['erf-apostrophe-themes'].updateBodyTheme(themeName, this.$props.themeType)
            }catch(e){
                window.apos.notify('Could not compose css for the preview. Please contact IT.', {
                    type: 'error',
                    icon: 'alert-circle-icon',
                    dismiss: true,
                })
            }
        }
    }
}
</script>

<style scoped>
    #erf-theme-edit-list {
        list-style: none;
        padding: 0;
    }
    #erf-theme-edit-list > li,
    #erf-theme-edit-list > li > div > div > ul > li {
        margin: 1.5rem 0;
    }
    #erf-theme-edit-list > li > div > div > div > label {
        color: var(--a-text-primary);
        font-family: var(--a-family-default);
        font-size: var(--a-type-base);
        font-weight: var(--a-weight-base);
        letter-spacing: var(--a-letter-base);
        line-height: var(--a-line-base);
        font-size: var(--a-type-label);
        line-height: var(--a-line-tall);
        display: block;
        margin: 0 0 10px;
        padding: 0;
        color: var(--a-text-primary);
    }
</style>