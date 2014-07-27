import { Transitions } from "vendor/liquid-fire";
import Ember from "ember";

var t, oldView, newContent, parentView;
function dummyAction() {}
function otherAction() {}

function lookupTransition() {
  return t.transitionFor(parentView, oldView, newContent).animation;
}

function setRoutes(o, n) {
  if (o) {
    oldView = Ember.View.create({
      currentView: Ember.View.create({renderedName: o})
    });
  } else {
    oldView = null;
  }
  if (n) {
    newContent = Ember.View.create({renderedName: n});
  } else {
    newContent = null;
  }
}

function setContexts(o, n) {
  if (o && !(o instanceof Ember.Object)) {
    o = Ember.Object.create(o);
  }

  if (n && !(n instanceof Ember.Object)) {
    n = Ember.Object.create(n);
  }


  if (o) {
    oldView.get('currentView').set('liquidContext', o);
  } else {
    oldView.get('currentView').set('liquidContext', null);
  }
  if (n) {
    newContent.set('liquidContext', n);
  } else {
    newContent.set('liquidContext', null);
  }
}

module("Transitions DSL", {
  setup: function(){
    t = new Transitions();
  },
  teardown: function(){
    t = oldView = newContent = null;
  }
});

test("matches source & destination routes", function(){
  t.map(function(){
    this.transition(
      this.fromRoute('one'),
      this.toRoute('two'),
      this.use(dummyAction)
    );
  });
  setRoutes('one', 'two');
  equal(lookupTransition(), dummyAction);

  setRoutes('x', 'two');
  equal(lookupTransition(), undefined);

  setRoutes(null, 'two');
  equal(lookupTransition(), undefined);

  setRoutes('one', 'x');
  equal(lookupTransition(), undefined);

  setRoutes('one', null);
  equal(lookupTransition(), undefined);

});

test("matches just source route", function(){
  t.map(function(){
    this.transition(
      this.fromRoute('one'),
      this.use(dummyAction)
    );
  });

  setRoutes('one', 'bogus');
  equal(lookupTransition(), dummyAction);

  setRoutes('one', null);
  equal(lookupTransition(), dummyAction);

  setRoutes('other', 'two');
  equal(lookupTransition(), undefined);

  setRoutes(null, 'two');
  equal(lookupTransition(), undefined);
});

test("matches just destination route", function(){
  t.map(function(){
    this.transition(
      this.toRoute('two'),
      this.use(dummyAction)
    );
  });

  setRoutes('bogus', 'two');
  equal(lookupTransition(), dummyAction, 'with a source route');

  setRoutes(null, 'two');
  equal(lookupTransition(), dummyAction, 'with empty source route');

  setRoutes('bogus', 'twox');
  equal(lookupTransition(), undefined, 'with other destination');

  setRoutes('bogus', null);
  equal(lookupTransition(), undefined, 'with empty destination');

});

test("matches empty source route", function(){
  t.map(function(){
    this.transition(
      this.fromRoute(null),
      this.toRoute('two'),
      this.use(dummyAction)
    );
  });

  setRoutes('bogus', 'two');
  equal(lookupTransition(), undefined, 'non-empty source');

  setRoutes(null, 'two');
  equal(lookupTransition(), dummyAction, 'empty source');
});

test("matches source & destination contexts", function(){
  t.map(function(){
    this.transition(
      this.fromModel(function(){ return this && this.isMySource; }),
      this.toModel(function(){ return this && this.isMyDestination; }),
      this.use(dummyAction)
    );
  });

  setRoutes('one', 'one');

  setContexts({isMySource: true}, {isMyDestination: true});
  equal(lookupTransition(), dummyAction, 'both match');

  setContexts(null, {isMyDestination: true});
  equal(lookupTransition(), undefined, 'empty source');

  setContexts({isMySource: true}, null);
  equal(lookupTransition(), undefined, 'empty destination');

  setContexts({isMySource: false}, {isMyDestination: true});
  equal(lookupTransition(), undefined, 'other source');

  setContexts({isMySource: true}, {isMyDestination: false});
  equal(lookupTransition(), undefined, 'other destination');

});

test("matches routes & contexts", function(){
  t.map(function(){
    this.transition(
      this.fromRoute('one'),
      this.toRoute('two'),
      this.fromModel(function(){ return this && this.isMySource; }),
      this.toModel(function(){ return this && this.isMyDestination; }),
      this.use(dummyAction)
    );
  });

  setRoutes('one', 'two');

  setContexts({isMySource: true}, {isMyDestination: true});
  equal(lookupTransition(), dummyAction, 'both match');

  setContexts(null, {isMyDestination: true});
  equal(lookupTransition(), undefined, 'empty source');

  setContexts({isMySource: true}, null);
  equal(lookupTransition(), undefined, 'empty destination');

  setContexts({isMySource: false}, {isMyDestination: true});
  equal(lookupTransition(), undefined, 'other source');

  setContexts({isMySource: true}, {isMyDestination: false});
  equal(lookupTransition(), undefined, 'other destination');

  setRoutes('one', 'three');
  setContexts({isMySource: true}, {isMyDestination: true});
  equal(lookupTransition(), undefined, 'wrong destination route');

  setRoutes('three', 'two');
  setContexts({isMySource: true}, {isMyDestination: true});
  equal(lookupTransition(), undefined, 'wrong source route');

});

test("backtracks past partial route matches", function(){
  t.map(function(){
    this.transition(
      this.fromRoute('one'),
      this.toRoute('two'),
      this.use(otherAction)
    );
    this.transition(
      this.fromRoute('one'),
      this.toRoute('three'),
      this.use(dummyAction)
    );
  });

  setRoutes('one', 'three');
  equal(lookupTransition(), dummyAction, 'both match');
});

test("backtracks past partial context matches", function(){
  t.map(function(){
    this.transition(
      this.fromModel(function(){ return true; }),
      this.toModel(function(){ return false; }),
      this.use(otherAction)
    );
    this.transition(
      this.fromModel(function(){ return true; }),
      this.toModel(function(){ return true; }),
      this.use(dummyAction)
    );
  });

  setRoutes('one', 'three');
  equal(lookupTransition(), dummyAction, 'matches');
});

test("backtracks to default route", function(){
  t.map(function(){
    this.transition(
      this.fromRoute('x'),
      this.toModel(function(){ return false; }),
      this.use(otherAction)
    );
    this.transition(
      this.toModel(function(){ return true; }),
      this.use(dummyAction)
    );
  });

  setRoutes('x', 'three');
  equal(lookupTransition(), dummyAction, 'matches');
});

test("matching context takes precedence over default", function(){
  t.map(function(){
    this.transition(
      this.use(otherAction)
    );
    this.transition(
      this.toModel(function(){ return true; }),
      this.use(dummyAction)
    );
  });

  setRoutes('x', 'three');
  equal(lookupTransition(), dummyAction, 'matches');
});



test("matches between contexts", function(){
  t.map(function(){
    this.transition(
      this.betweenModels(function(){ return this && this.isThing; }),
      this.use(dummyAction)
    );
  });

  setRoutes('one', 'one');

  setContexts({isThing: true}, {isThing: true});
  equal(lookupTransition(), dummyAction, 'both match');

  setContexts(null, {isThing: true});
  equal(lookupTransition(), undefined, 'empty source');

  setContexts({isThing: true}, null);
  equal(lookupTransition(), undefined, 'empty destination');

  setContexts({isThing: false}, {isThing: true});
  equal(lookupTransition(), undefined, 'other source');

  setContexts({isThing: true}, {isThing: false});
  equal(lookupTransition(), undefined, 'other destination');

});

test("can target empty routes", function() {
  t.map(function(){
    this.transition(
      this.fromRoute(null),
      this.toRoute('one'),
      this.use(dummyAction)
    );
  });
  setRoutes(null, 'one');
  equal(lookupTransition(), dummyAction, 'should match');

  setRoutes('two', 'one');
  equal(lookupTransition(), undefined, 'should not match');
});

test("can target empty context", function() {
  t.map(function(){
    this.transition(
      this.fromModel(null),
      this.toModel(function(){ return true; }),
      this.use(dummyAction)
    );
  });
  setRoutes('one', 'one');

  setContexts(null, {});
  equal(lookupTransition(), dummyAction, 'should match');

  setContexts({}, {});
  equal(lookupTransition(), undefined, 'should not match');
});

test("matches instanceOf contexts", function() {
  var Pet = Ember.Object.extend();
  var Owner = Ember.Object.extend();

  t.map(function(){
    this.transition(
      this.fromModel({instanceOf: Pet}),
      this.toModel({instanceOf: Owner}),
      this.use(dummyAction)
    );
    this.transition(
      this.fromModel({instanceOf: Owner}),
      this.toModel({instanceOf: Pet}),
      this.use(otherAction)
    );
  });

  setRoutes('one', 'one');

  setContexts(Pet.create(), Owner.create());
  equal(lookupTransition(), dummyAction, 'Pet to Owner');

  setContexts(Owner.create(), Pet.create());
  equal(lookupTransition(), otherAction, 'Owner to Pet');

  setContexts(Ember.ObjectController.create({model: Owner.create()}), Pet.create());
  equal(lookupTransition(), otherAction, 'Sees through controllers');

});


test("passes arguments through to transitions", function() {
  t.map(function(){
    this.transition(
      this.fromRoute('one'),
      this.toRoute('two'),
      this.use(dummyAction, 1, 2, 3)
    );
    this.transition(
      this.fromRoute('one'),
      this.toRoute('three'),
      this.use('fancySpin', 4, 5, 6)
    );
    this.define('fancySpin', otherAction);
  });

  setRoutes('one', 'two');


  deepEqual(t.transitionFor(parentView, oldView, newContent).animationArgs, [1,2,3], 'with function');

  setRoutes('one', 'three');
  deepEqual(t.transitionFor(parentView, oldView, newContent).animationArgs, [4,5,6], 'with named transition');

});

test("rejects multiple uses of fromRoute in a single transition", function(){
  throws(function(){
    t.map(function(){
      this.transition(
        this.fromRoute('x'),
        this.fromRoute('y'),
        this.use(dummyAction)
      );
    });
  }, /multiple constraints on fromRoute/);
});

test("accepts multiple source routes", function(){
  t.map(function(){
    this.transition(
      this.fromRoute('one', 'two'),
      this.use(dummyAction)
    );
  });

  setRoutes('one', 'bogus');
  equal(lookupTransition(), dummyAction);

  setRoutes('two', 'bogus');
  equal(lookupTransition(), dummyAction);

});

test("accepts multiple destination routes", function(){
  t.map(function(){
    this.transition(
      this.toRoute('one', 'two'),
      this.use(dummyAction)
    );
  });

  setRoutes('bogus', 'one');
  equal(lookupTransition(), dummyAction);

  setRoutes('bogus', 'two');
  equal(lookupTransition(), dummyAction);

});

test("combines multiple context constraints", function(){
  var Pet = Ember.Object.extend();

  t.map(function(){
    this.transition(
      this.toModel({instanceOf: Pet}),
      this.toModel(function(){ return this.get('name') === 'Fluffy';}),
      this.use(dummyAction)
    );
  });

  setRoutes('one', 'one');
  setContexts(null, Pet.create());
  equal(lookupTransition(), undefined, "should not match because of name");

  setContexts(null, Ember.Object.create({name: 'Fluffy'}));
  equal(lookupTransition(), undefined, "should not match because of instanceof");

  setContexts(null, Pet.create({name: 'Fluffy'}));
  equal(lookupTransition(), dummyAction, "should match both");

});

test("warn about combining empty matcher and other predicates ", function(){
  throws(function(){
    t.map(function(){
      this.transition(
        this.toModel(null),
        this.toModel(function(){ return this.get('name') === 'Fluffy';}),
        this.use(dummyAction)
      );
    });
  }, /cannot combine empty model matcher/);
});
