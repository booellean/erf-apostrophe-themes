export default () => {
    const body = document.querySelector('body')

    window.apos.util.widgetPlayers['erf-apostrophe-themes'] =
    {
        selector: '.tabs',
        player: function (els) {},
        changeTheme(theme, type){
            console.log('changing theme')
            // We are separting this logic so we can call this function in our Vue components without affecting the button/switch styles
            let parents = document.querySelectorAll('.theme__'+type)
            for(let i = 0; i < parents.length; i++){
                let parent = parents[i]
                for(let j = 0; j < parent.children.length; j++){
                    let child = parent.children[j]
                    if(child.classList.contains(`theme__${theme}`)){
                        child.classList.add('selected')
                    }else{
                        child.classList.remove('selected')
                    }
                }
            }
            // Set cookie for autoloading between pages
            let themeStore = apos.util.getCookie(`${window.apos.shortName}.erf-themes`);
            let themes = themeStore ? JSON.parse(themeStore) : {}
            themes[type] = theme
            window.localStorage.setItem('erf-themes', JSON.stringify(themes))
            document.cookie = `${window.apos.shortName}.erf-themes=${JSON.stringify(themes)}`;

            // Update Body data and classes
            window.apos.util.widgetPlayers['erf-apostrophe-themes'].updateBodyTheme(theme, type)
        },
        updateBodyTheme(theme, type){
            let safeType = type.toLowerCase().replaceAll(' ', '')
            const className = new RegExp(`\\bthemes-${safeType}-.+?\\b`, 'g');
            body.className = body.className.replace(className, `themes-${safeType}-${theme}`)
            body.dataset[`theme${(safeType[0].toUpperCase() + safeType.substring(1)).replace(/-([a-z])/g, s => s.slice(-1).toUpperCase())}`] = theme
        }
    }
}