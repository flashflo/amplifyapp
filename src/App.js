import React, { useState, useEffect } from 'react';
import './App.css';
import "../node_modules/jexcel/dist/jexcel.css";
import { API, Storage } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import { listNotes } from './graphql/queries';
import { createNote as createNoteMutation, deleteNote as deleteNoteMutation } from './graphql/mutations';
import ReactDOM from "react-dom";
import jexcel from "jexcel";

const initialFormState = { name: '', description: '' }

class Jexcel extends React.Component {
    constructor(props) {
        super(props);
        this.options = props.options;
    }

    componentDidMount = function() {
        this.el = jexcel(ReactDOM.findDOMNode(this).children[0], this.options);
    }

    addRow = function() {
        this.el.insertRow();
    }

    render() {
        return (
            <div>
                <div></div><br/><br/>
                <input type='button' value='Add new row' onClick={() => this.addRow()}></input>
            </div>
        );
    }
}
var data = [
    ['Mazda', 2001, '', '2006-01-01'],
    ['Pegeout', 2010, '', '2005-01-01'],
    ['Honda Fit', 2009, '', '2004-01-01'],
    ['Honda CRV', 2010, '', '2003-01-01'],
];

var options = {
    data:data,
    columns: [
        { type: 'text', width:300 },
        { type: 'text', width:80 },
        { type: 'text', width:100 },
        { type: 'calendar', width:100 },
    ]
};


ReactDOM.render(<Jexcel options={options} />, document.getElementById('spreadsheet'))

function App() {


  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    fetchNotes();
  }, []);

  async function onChange(e) {
    if (!e.target.files[0]) return
    const file = e.target.files[0];
    setFormData({ ...formData, image: file.name });
    await Storage.put(file.name, file);
    fetchNotes();
  }

  async function fetchNotes() {
    const apiData = await API.graphql({ query: listNotes });
    const notesFromAPI = apiData.data.listNotes.items;
    await Promise.all(notesFromAPI.map(async note => {
      if (note.image) {
        const image = await Storage.get(note.image);
        note.image = image;
      }
      return note;
    }))
    setNotes(apiData.data.listNotes.items);
  }

  async function createNote() {
    if (!formData.name || !formData.description) return;
    await API.graphql({ query: createNoteMutation, variables: { input: formData } });
    if (formData.image) {
      const image = await Storage.get(formData.image);
      formData.image = image;
    }
    setNotes([ ...notes, formData ]);
    setFormData(initialFormState);
  }

  async function deleteNote({ id }) {
    const newNotesArray = notes.filter(note => note.id !== id);
    setNotes(newNotesArray);
    await API.graphql({ query: deleteNoteMutation, variables: { input: { id } }});
  }

  return (
    <div className="App">
      <h1>My Notes App</h1>
      <input
        onChange={e => setFormData({ ...formData, 'name': e.target.value})}
        placeholder="Note name"
        value={formData.name}
      />
      <input
        onChange={e => setFormData({ ...formData, 'description': e.target.value})}
        placeholder="Note description"
        value={formData.description}
      />
      <button onClick={createNote}>Create Note</button>
      <input
        type="file"
        onChange={onChange}
      />
      <div style={{marginBottom: 30}}>
        {
          notes.map(note => (
            <div key={note.id || note.name}>
              <h2>{note.name}</h2>
              <p>{note.description}</p>
              <button onClick={() => deleteNote(note)}>Delete note</button>
              {
                note.image && <img src={note.image} style={{width: 400}} />
              }
            </div>
          ))
        }
      </div>
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);
