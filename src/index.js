import _ from 'lodash'
import printMe from './print.js'
import { cube } from './math.js'

import './style.css'
import a from './a.png'

function component() {
    const element = document.createElement('div')
    const element2 = document.createElement('img')
    const btn = document.createElement('button')

    element2.src = a

    element.innerHTML = _.join(['Hello', 'World!', cube(5)], ' ')
    element.classList.add('red')
    btn.innerHTML = 'Click Me!'
    btn.onclick = printMe

    element.appendChild(element2)
    element.appendChild(btn)

    return element
}

document.body.appendChild(component())