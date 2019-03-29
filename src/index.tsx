import React from 'react'
import ReactDOM from 'react-dom'
import printMe from './print'

interface propTypes {
    name: string
}

const App: React.SFC<propTypes> = () => {
    console.log(printMe('dd'))
    return (
        <div>
            ddd
        </div>
    )
}

ReactDOM.render(<App name="hi" />, document.getElementById('root'))
