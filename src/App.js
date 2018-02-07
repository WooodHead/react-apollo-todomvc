import React, { Component } from "react";
import { ApolloClient } from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { withClientState } from "apollo-link-state";
import { ApolloProvider, graphql } from "react-apollo";
import gql from "graphql-tag";

import "todomvc-app-css/index.css";
import "./App.css";

let nextTodoId = 0;

class Header extends Component {
  state = { text: "" };
  render() {
    const { onNewTodo } = this.props;
    return (
      <header className="header">
        <h1>todos</h1>
        <input
          className="new-todo"
          onChange={({ target }) =>
            this.setState(({ text }) => ({ text: target.value }))
          }
          onKeyPress={({ key }) => {
            if (key === "Enter") {
              onNewTodo({ text: this.state.text });
              this.setState({ text: "" });
            }
          }}
          value={this.state.text}
          placeholder="What needs to be done?"
        />
      </header>
    );
  }
}

Header = graphql(
  gql`
    mutation addTodo($text: String!) {
      addTodo(text: $text) @client
    }
  `,
  {
    props: ({ mutate }) => ({
      onNewTodo: ({ text }) => mutate({ variables: { text } })
    })
  }
)(Header);

class Main extends Component {
  render() {
    const { todos, completeAllTodos } = this.props;
    return todos && todos.length ? (
      <section className="main">
        <input
          className="toggle-all"
          type="checkbox"
          onChange={completeAllTodos}
          checked={false}
        />
        <label htmlFor="toggle-all">Mark all as complete</label>
        <ul className="todo-list">
          {todos.map(todo => (
            <li
              key={todo.id}
              className={todo.completed ? "completed" : undefined}
            >
              <div className="view">
                <input className="toggle" type="checkbox" />
                <label>{todo.text}</label>
                <button className="destroy" />
              </div>
              <input className="edit" onChange={() => {}} value={todo.text} />
            </li>
          ))}
        </ul>
      </section>
    ) : null;
  }
}

Main = graphql(
  gql`
    query {
      todos @client {
        id
        text
        completed
      }
    }
  `,
  {
    props: ({ data: { todos } }) => {
      return {
        todos
      };
    }
  }
)(Main);

Main = graphql(
  gql`
    mutation completeAllTodos {
      completeAllTodos @client
    }
  `,
  {
    props: ({ mutate }) => ({
      completeAllTodos: mutate
    })
  }
)(Main);

class App extends Component {
  constructor() {
    super();
    const cache = new InMemoryCache();
    const getTodosQuery = gql`
      query GetTodos {
        todos @client {
          id
          text
          completed
        }
      }
    `;
    const stateLink = withClientState({
      cache,
      resolvers: {
        Mutation: {
          addTodo: (_, { text }, { cache }) => {
            const previous = cache.readQuery({ query: getTodosQuery });
            const newTodo = {
              id: nextTodoId,
              text,
              completed: false,
              /**
               * Resolvers must return an object with a __typename property
               * [Source](https://www.apollographql.com/docs/link/links/state.html#resolver)
               */
              __typename: "TodoItem"
            };
            nextTodoId = nextTodoId + 1;
            const data = {
              todos: previous.todos.concat([newTodo])
            };
            cache.writeData({ data });
            return newTodo;
          },
          completeAllTodos: (_, variables, { cache }) => {
            const previous = cache.readQuery({ query: getTodosQuery });
            const areAllCompleted = previous.todos.every(
              todo => todo.completed
            );
            const data = {
              todos: previous.todos.map(todo => ({
                ...todo,
                completed: areAllCompleted ? false : true
              }))
            };
            cache.writeData({ data });
            return null;
          }
        }
      },
      defaults: {
        todos: []
      }
    });
    const client = new ApolloClient({
      link: stateLink,
      cache
    });
    this.state = {
      cache,
      client
    };
  }
  render() {
    return (
      <ApolloProvider client={this.state.client}>
        <div className="todoapp">
          <Header />
          <Main />
        </div>
      </ApolloProvider>
    );
  }
}

export default App;
