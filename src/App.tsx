import { hot } from 'react-hot-loader';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import "./index.css";
import "normalize.css/normalize.css";
// import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import { Schedule } from './components/Schedule';

const App = () => (<Schedule/>)
const HotApp = hot(module)(App);

ReactDOM.render(<HotApp/>, document.getElementById('root'));
