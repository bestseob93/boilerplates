import _ from 'lodash'
import './style.css'
import Cat from './cat.jpg'

function component() {
    const element = document.createElement('div')

    element.innerHTML = _.join(['Hello', 'webpack'], ' ')
    element.classList.add('hello')
    const myCat = new Image()
    myCat.src = Cat
    element.appendChild(myCat)

    return element
}

document.body.appendChild(component())