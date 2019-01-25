import axios from "axios";

export default {

  data() {
    return {
      dictionary: {
        homeMemberStates: [],
        docClasses: [{
            "id": -1,
	          "name": "Loading...",
	          "subclass": []
          },{
            "id": -2,
	          "name": "Loading...",
	          "subclass": []
          }
        ],
        docClassSubclass: [],
        docClassTags: {},
        docClassLabels: {},
        languages: [],
        identifiers: {},
        error:{
          homeMemberStates: null,
          docClasses: null,
          docClassTags: null,
          languages: null,
          identifiers: null
        }
      }
    }
  },
  
  created(){
  
    let self = this;      
    
    
    // JSON Home member states
    axios.get('https://cdn.blkcc.xyz/home_member_states.json').then(function(result){
      self.dictionary.homeMemberStates = result.data;
      self.dictionary.homeMemberStates.forEach(homeMemberState => homeMemberState.label = homeMemberState.code + ' - ' + homeMemberState.country);
    }).catch(function(error){
      self.dictionary.error.homeMemberStates = error;    
    });
    
    
    // JSON Languages
    axios.get('https://cdn.blkcc.xyz/lang.json').then(function(result){
      self.dictionary.languages = result.data;
    }).catch(function(error){
      self.dictionary.error.languages = error;
    });      
      
    
    // JSON Identifiers
    axios.get('https://cdn.blkcc.xyz/identifier.json').then(function(result){
      self.dictionary.identifiers = result.data;      
    }).catch(function(error){
      self.dictionary.error.identifiers = error;              
    });
    
    
    // JSON Classes and Subclasses
    axios.get('https://cdn.blkcc.xyz/class_subclass_tree.json').then(function(result){
      self.dictionary.docClasses = result.data;
      
      // saving tags in docClassTags and docClassSubclass
      var k=0;
      for(var i=0; i<self.dictionary.docClasses.length; i++){
        var c = self.dictionary.docClasses[i]
        c.number = (i+1) + '.';
        c.type = 'class';
        c.label = c.number + ' ' + c.name;
        self.$set(self.dictionary.docClassSubclass, k, c)
        k++          
        
        for(var j=0; j<self.dictionary.docClasses[i].subclass.length; j++){
          var subc = self.dictionary.docClasses[i].subclass[j];
          subc.number = (i+1) + '.' + (j+1) + '.'
          subc.type = 'subclass'
          subc.label = subc.number + ' ' + subc.name;
          self.$set(self.dictionary.docClassSubclass, k, subc)
          k++
          
          self.dictionary.docClassTags[subc.id+""] = subc.tag; 
          self.dictionary.docClassLabels[subc.id+""] = subc.label; 
        }
      }
    }).catch(function(error){
      self.dictionary.error.docClasses = error;        
    });    
  }
}