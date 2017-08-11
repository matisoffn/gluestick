import React from 'react';

function isInitialRender({ history }, DataLoader) {
  const output =
    (history.action === 'POP' && !DataLoader.isRendered) ||
    typeof window === 'undefined';

  // eslint-disable-next-line no-param-reassign
  DataLoader.isRendered = true;

  return output;
}

export default function withDataLoader(config) {
  const { Loading, onEnter, shouldReloadData } = config;

  return Component => {
    class DataLoader extends React.Component {
      static onEnter = onEnter;
      static isRendered = false;

      constructor(props) {
        super(props);

        this.state = {
          loaded:
            isInitialRender(this.props, DataLoader) ||
            (shouldReloadData ? !shouldReloadData() : false),
        };
      }

      async componentDidMount() {
        if (!this.state.loaded) {
          await DataLoader.onEnter(this.props.match, null);

          // eslint-disable-next-line react/no-did-mount-set-state
          this.setState({
            loaded: true,
          });
        }
      }

      render() {
        return this.state.loaded ? <Component /> : <Loading />;
      }
    }

    DataLoader.displayName = `${Component.displayName ||
      Component.name ||
      ''}DataLoader`;

    return DataLoader;
  };
}
