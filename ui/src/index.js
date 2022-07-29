export default () => {
    // TODO: get last saved theme
    // Apply backup theme
    const body = document.querySelector('body')
    
    function changeTheme(theme, type){
        // We are separting this logic so we can call this function in our Vue components without affecting the button/switch styles
        let parents = document.querySelectorAll('.theme__'+type)
        console.log(parents)
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
        if(window.localStorage){
            let themes = JSON.parse((window.localStorage.getItem('erf-themes') || '{}'))
            themes[type] = theme
            window.localStorage.setItem('erf-themes', JSON.stringify(themes))
        }
        updateBodyTheme(theme, type)
    }
    function updateBodyTheme(theme, type){
        let safeType = type.toLowerCase().replaceAll(' ', '')
        const className = new RegExp(`\\bthemes-${safeType}-.+?\\b`, 'g');
        body.className = body.className.replace(className, `themes-${safeType}-${theme}`)
        body.dataset[`theme${(safeType[0].toUpperCase() + safeType.substring(1)).replace(/-([a-z])/g, s => s.slice(-1).toUpperCase())}`] = theme
    }
    window.addEventListener('DOMContentLoaded', () => {
        console.log('content loaded')
        if(window.localStorage){
            let themes = JSON.parse((window.localStorage.getItem('erf-themes') || '{}'))
            for(let type in themes){
                let theme = themes[type]
                changeTheme(theme, type)
            }
        }
    }, { once: true })
}