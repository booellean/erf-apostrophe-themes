<template>
    <div>
        <apos-input-string
            v-model="currentCategory"
            :field="{ type: 'text', required: true, label: 'Name:', placeholder: 'light' }"
        />
        <accordian v-for="(group, groupName) in editGroups" :key="'theme-group-'+groupName" :title="group.label" role="group">
            <template v-slot:content>
                <div
                    v-for="field in group.fields" :key="'theme-group-'+groupName+'-field-'+field"
                    :data-apos-field="currentTheme[field].label"
                >
                    <component
                        v-model="themeValues[field].value"
                        :is="fieldComponentMap[currentTheme[field].type]"
                        :field="(schema.find( s => s.name === field) || {})"
                        :value="currentTheme[field].value || { data: (currentTheme[field].def || '') }"
                    />
                </div>
            </template>
        </accordian>
        <div role="group">
        <slot name="buttons" />
        </div>
    </div>
</template>

<script>
import AposInputString from 'apostrophe/modules/@apostrophecms/schema/ui/apos/components/AposInputString'
import Accordian from './pieces/Accordian'
//:field="{...themeValues[field], ...(schema.find( s => s.name === field) || {})}"
export default {
    emits: ['input-change'],
    components: { Accordian, AposInputString },
    props: {
        category: {
            type: String,
            required: true
        },
        currentTheme: {
            type: Object,
            required: true
        },
        editGroups: {
            type: Object,
            required: true
        },
        schema: {
            type: Array,
            required: true
        }
    },
    data() {
        let themeValues = {}
        let doc = Object.keys(this.$props.currentTheme).map( (name, index) => {
            let value = this.$props.currentTheme[name].value || { data: (this.$props.currentTheme[name].def || '') }
            let obj = {
                _id: index,
                name: name,
                moduleName: "erf-apostrophe-themes",
                required: true,
                value: value,
                ...this.$props.currentTheme[name]
            }
            themeValues[name] = obj
            return obj
        })

        return {
            currentCategory: { data: this.$props.category },
            fieldComponentMap: window.apos.schema.components.fields || {},
            themeValues: themeValues
        }
    },
    watch: {
        themeValues: {
            deep: true,
            // We have to move our method to a handler field
            handler(value){
                this.$emit('input-change', this.$data.currentCategory.data, this.$data.themeValues)
            }
        },
        'currentCategory.data': {
            handler(value){
                this.$emit('input-change', this.$data.currentCategory.data, this.$data.themeValues)
            }
           
        }
    },
    mounted(){
        console.log('form editing', this.$props, this.$data)
    }
}
</script>
