function highlight() {
  var highlightedNodes = $();

  try {
    for (var i = 0; i < currentSelection.length; i += 1) {
      var selection = currentSelection[i];
      var nodes = getAffectedNodes(selection.set, selection.direction);
      highlightedNodes = highlightedNodes.add(nodes);
    }
  } catch (err) {
    console.error(err);
    for (var j = 0; j < currentSelection.length; j += 1) {
      highlightedNodes = highlightedNodes.add(currentSelection[j].set);
    }
  }

  gv.highlight(highlightedNodes, true);
  //gv.bringToFront(highlightedNodes);
}

function normalizeNodeName(name) {
  return (name || "").trim().split(":")[0];
}

function getElementName(el) {
  return $(el).attr("data-name") || $(el).data("name");
}

function parseEdgeName(edgeName) {
  if (!edgeName) {
    return undefined;
  }

  var separator = undefined;
  if (edgeName.indexOf("->") !== -1) {
    separator = "->";
  } else if (edgeName.indexOf("--") !== -1) {
    separator = "--";
  }

  if (!separator) {
    return undefined;
  }

  var parts = edgeName.split(separator);
  if (parts.length < 2) {
    return undefined;
  }

  return {
    from: normalizeNodeName(parts[0]),
    to: normalizeNodeName(parts.slice(1).join(separator)),
    directed: separator === "->",
  };
}

function findNodeByName(nodeName) {
  var nodes = gv.nodesByName ? gv.nodesByName() : {};
  if (nodes[nodeName]) {
    return nodes[nodeName];
  }

  var foundNode = undefined;
  gv.nodes().each(function () {
    if (normalizeNodeName(getElementName(this)) === nodeName) {
      foundNode = this;
      return false;
    }
    return undefined;
  });
  return foundNode;
}

function addLinkedNodesAndEdges($result, nodeEl, mode) {
  var nodeName = normalizeNodeName(getElementName(nodeEl));
  if (!nodeName) {
    return $result;
  }

  gv.edges().each(function () {
    var edge = parseEdgeName(getElementName(this));
    if (!edge) {
      return;
    }

    var linkedNodeName = undefined;
    if (edge.directed) {
      if ((mode === "bidirectional" || mode === "downstream") && edge.from === nodeName) {
        linkedNodeName = edge.to;
      } else if ((mode === "bidirectional" || mode === "upstream") && edge.to === nodeName) {
        linkedNodeName = edge.from;
      }
    } else if (edge.from === nodeName) {
      linkedNodeName = edge.to;
    } else if (edge.to === nodeName) {
      linkedNodeName = edge.from;
    }

    if (!linkedNodeName) {
      return;
    }

    var linkedNode = findNodeByName(linkedNodeName);
    $result = $result.add(this);
    if (linkedNode) {
      $result = $result.add(linkedNode);
    }
  });

  return $result;
}

function addEdgeEndpoints($result, edgeEl, mode) {
  var edge = parseEdgeName(getElementName(edgeEl));
  if (!edge) {
    return $result;
  }

  var nodeNames = [];
  if (!edge.directed) {
    nodeNames.push(edge.from, edge.to);
  } else {
    if (mode === "bidirectional" || mode === "upstream") {
      nodeNames.push(edge.from);
    }
    if (mode === "bidirectional" || mode === "downstream") {
      nodeNames.push(edge.to);
    }
  }

  for (var i = 0; i < nodeNames.length; i += 1) {
    var node = findNodeByName(nodeNames[i]);
    if (node) {
      $result = $result.add(node);
    }
  }

  return $result;
}

function getAffectedNodes($set, $mode) {
  var mode = $mode || "bidirectional";
  var $result = $().add($set);
  if (mode === "single") {
    return $result;
  }

  $set.each(function () {
    if ($(this).hasClass("edge")) {
      $result = addEdgeEndpoints($result, this, mode);
    } else if ($(this).hasClass("node")) {
      $result = addLinkedNodesAndEdges($result, this, mode);
    }
  });

  return $result;
}
