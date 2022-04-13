import dynamic from 'next/dynamic';
import getData from '@/helpers/data';
import Link from 'next/link';
import { Suspense, useEffect } from 'react';
import useStore from '@/helpers/store';
import { Stats } from '@react-three/drei';

const LoadingExperiment = () => {
  useEffect(() => {
    useStore.setState({ experimentLoaded: false });

    return () => {
      useStore.setState({ experimentLoaded: true });
    };
  }, []);

  return <></>;
};

// dom components goes here
const DOM = ({ experiment }) => {
  const { experimentLoaded, debug } = useStore();

  useEffect(() => {
    if (window.location.hash === '#debug') {
      useStore.setState({ debug: true });
    }
  }, []);

  return (
    <>
      <div className='experiment'>
        {debug && <Stats />}
        <div className={`loadingIndicator ${experimentLoaded ? 'out' : ''}`}>
          <h3>loading experiment</h3>
          <h1>{experiment.name.toUpperCase()}</h1>
          <div className='bar' />
        </div>
        <div className='hud' style={{ color: experiment.hudColor }}>
          <div className='back'>
            <Link href={'/'}>
              <a style={{ color: experiment.hudColor }}>back to experiments</a>
            </Link>
            <div
              className='backdrop'
              style={{ backgroundColor: experiment.themeColor }}
            />
          </div>
          <h1 style={{ pointerEvents: 'none', touchAction: 'none' }}>
            {experiment.name.toLowerCase()}
          </h1>

          <div
            className='codeBtn'
            style={{
              backgroundColor: experiment.themeColor,
              boxShadow: `0px 0px 10px 2px ${experiment.hudColor}88`,
            }}
          >
            <a
              style={{ color: experiment.hudColor }}
              rel='noreferrer'
              target='_blank'
              href={`https://github.com/JMBeresford/lab/tree/main/src/components/canvas/experiments/${experiment.page}`}
            >
              {'</>'}
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

// canvas components goes here
const R3F = ({ experiment }) => {
  const Experiment = dynamic(
    () => import(`@/components/canvas/experiments/${experiment.page}`),
    { ssr: false }
  );

  return (
    <>
      <Suspense fallback={<LoadingExperiment />}>
        <Experiment />
      </Suspense>
    </>
  );
};

const Experiment = ({ experiment }) => {
  return (
    <>
      <DOM experiment={experiment} />
      <R3F r3f experiment={experiment} />
    </>
  );
};

export default Experiment;

export async function getStaticProps({ params }) {
  const experiment = getData().find((e) => e.page === params.id);

  return {
    props: {
      title: experiment.name,
      experiment,
    },
  };
}

export async function getStaticPaths() {
  const data = getData();

  const paths = data.map((experiment) => {
    return {
      params: {
        id: experiment.page,
      },
    };
  });

  return {
    paths,
    fallback: false,
  };
}
