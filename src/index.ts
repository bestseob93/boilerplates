import * as _ from 'lodash'
import printMe from './print'
import { cube } from './math'

import './style.css'

function component() {
    const element = document.createElement('div')
    const btn = document.createElement('button')

    element.innerHTML = _.join(['Hello', 'World!', cube(5)], ' ')
    element.classList.add('red')
    btn.innerHTML = 'Click Me!'
    btn.onclick = printMe

    element.appendChild(btn)

    return element
}

document.body.appendChild(component())