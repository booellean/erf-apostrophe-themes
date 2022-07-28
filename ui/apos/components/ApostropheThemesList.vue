<template>
    <div>
        <table class="apos-table">
            <tbody>
                <tr class="apos-table__row">
                    <th class="apos-table__header apos-table__header--theme-title">
                        <span class="apos-table__header-label">Title</span>
                    </th>
                    <th class="apos-table__header apos-table__header--theme-themeType">
                        <span class="apos-table__header-label">Type</span>
                    </th>
                    <th class="apos-table__header apos-table__header--theme-activated">
                    </th>
                    <th class="apos-table__header apos-table__header--theme-aposMode">
                    </th>
                    <th class="apos-table__header apos-table__header--theme-updatedAt">
                        <span class="apos-table__header-label">Last Updated</span>
                    </th>
                    <th class="apos-table__header apos-table__header--theme-actions">
                        <span class="apos-table__header-label">Actions</span>
                    </th>
                </tr>
                <tr v-for="(item, index) in items"
                    :key="item._id"
                    class="apos-table__row"
                >
                    <td class="apos-table__cell">
                        <p class="apos-table__cell-field apos-table__cell-field--title">
                            {{item.doc.title}}
                        </p>
                    </td>
                    <td class="apos-table__cell">
                        <p class="apos-table__cell-field apos-table__cell-field--themeType">
                            {{item.doc.themeType}}
                        </p>
                    </td>
                    <td class="apos-table__cell">
                        <p v-if="item.doc.activated" class="apos-table__cell-field apos-table__cell-field--activated">
                            <apos-label
                                label="Active" class="apos-table__cell-field__label"
                                :modifiers="[ 'apos-is-filled', 'apos-is-success' ]"
                            />
                        </p>
                    </td>
                    <td class="apos-table__cell">
                        <p class="apos-table__cell-field apos-table__cell-field--aposMode">
                            <apos-label
                                v-if="item.doc.aposMode === 'published'"
                                label="Published" class="apos-table__cell-field__label"
                                :modifiers="[ 'apos-is-success' ]"
                            />
                            <apos-label
                                v-else
                                label="Draft" class="apos-table__cell-field__label"
                                :modifiers="[ 'apos-is-filled', 'apos-is-warning' ]"
                            />
                        </p>
                        
                    </td>
                    <td class="apos-table__cell">
                        <p class="apos-table__cell-field apos-table__cell-field--relative-time apos-table__cell-field--updatedAt">
                            {{ returnDateString(item.doc.updatedAt) }}
                        </p>
                    </td>
                    <td class="apos-table__cell">
                        <div class="apos-table__cell-field apos-table__cell-field--context-menu apos-tree__cell apos-tree__cell--contextMenu"
                            data-col="contextMenu"
                            style="width: 39px;"
                        >
                            <apos-context-menu
                                class="apos-admin-bar_context-button"
                                :menu="menu(item)"
                                menu-placement="bottom-end"
                                @item-clicked="(emitName) => emitItemEdit(emitName, item, index)"
                                :button="{
                                    tooltip: { content: 'apostrophe:moreOptions', placement: 'bottom' },
                                    label: 'apostrophe:moreOptions',
                                    icon: 'dots-vertical-icon',
                                    iconOnly: true,
                                    type: 'subtle',
                                    modifiers: ['small', 'no-motion']
                                }"
                            />
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script>
import AposButton from 'apostrophe/modules/@apostrophecms/ui/ui/apos/components/AposButton'
import AposContextMenu from 'apostrophe/modules/@apostrophecms/ui/ui/apos/components/AposContextMenu'
import AposLabel from 'apostrophe/modules/@apostrophecms/ui/ui/apos/components/AposLabel'

export default {
    name: 'ApostropheThemesList',
    emits: ['copy-item', 'delete-item', 'discard-draft', 'edit-item'],
    components: { AposButton, AposContextMenu, AposLabel },
    props: {
        items: {
            type: Array,
            required: true
        },
    },
    methods: {
        emitItemEdit(emitName, item, index){
            this.$emit(emitName, item, index)
        },
        returnDateString(date){
            let string = new Date(date)
            return string.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric'})
        },
        menu(theme) {
            return [
                {
                    label: 'Edit',
                    action: 'edit-item'
                },
                {
                    label: 'Copy',
                    action: 'copy-item'
                },
                // Determine if this is a draft...
                ...((theme.doc.aposMode === 'draft') ? [
                    {
                        // When archived the edit action opens a read-only "editor"
                        label: 'Discard Draft',
                        action: 'discard-draft'
                    }
                ] : []),
                {
                    label: 'Delete',
                    action: 'delete-item'
                },
            ];
        }
    }
}
</script>