export function getAllChosenCharacter(e, type, className) {
    let chosenNodes = Array.from(document.querySelectorAll(`input[type=checkbox][id='${type}-${className}']:checked`));
    let chosenNodeIds = chosenNodes.map((node) => {
      if(node.value === "on") {
        return node.value;
      }
      if(className === "main") {
        return node.value;
      }
      return JSON.parse(node.value);
    });
    if(chosenNodeIds.filter((id) => id === "on").length > 0){
      chosenNodes = Array.from(e.target.form.querySelectorAll(`input[type=checkbox][id='${type}']`));
      chosenNodeIds = chosenNodes.map((node) => {
        if(className === "main") {
          return node.value;
        }
        if(node.value === "on") {
          return node.value;
        }
        return JSON.parse(node.value);
      } );
      return chosenNodeIds;
    }
    if(e.target.value === "on" && !e.target.checked) {
      chosenNodes = Array.from([]);
      chosenNodeIds = chosenNodes.map((node) => {
        if(className === "main") {
          return node.value;
        }
        if(node.value === "on") {
        return node.value;
      }
        return JSON.parse(node.value);
      });
      return chosenNodeIds;
    }
    return chosenNodeIds;
  }

export function resetSelection(e, type, className) {
    let chosenNodes = Array.from(document.querySelectorAll(`input[type=checkbox][id='${type}-${className}']:checked`));
    for(const node of chosenNodes) {
        node.checked = false;
    }
}