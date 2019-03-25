import _ from 'lodash'
import printMe from './print.js'
import { cube } from './math.js'

function component() {
    const element = document.createElement('div')
    const btn = document.createElement('button')

    element.innerHTML = _.join(['Hello', 'webpack'], ' ')
    btn.innerHTML = 'Click me and check the console!'
    btn.onclick = printMe
    console.log('hello')
    console.log(cube(5))

    element.appendChild(btn)

    return element
}

document.body.appendChild(component())