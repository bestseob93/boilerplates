import React from 'react'
import ReactDOM from 'react-dom'
import printMe from './print'
import ss from './cat.jpg'
import ab from './ss.svg'

interface propTypes {
    name: string
}

const App: React.SFC<propTypes> = () => {
    console.log(printMe('dd'))
    return (
        <div>
            <img src={ss} />
        </div>
    )
}

ReactDOM.render(<App name="hi" />, document.getElementById('root'))
