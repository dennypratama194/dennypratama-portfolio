import { EMAIL } from '@/lib/site';
import { Arrow } from '../Icons';

/**
 * There is no mailing-list provider yet, so don't promise a subscription or an unsubscribe workflow.
 * Offer a useful editorial contact action until a real double-opt-in service is implemented.
 */
export function Newsletter() {
  return (
    <section className="nl-b on-bone" aria-labelledby="nl-h">
      <div className="wrap">
        <div className="nl-g grid">
          <h2 className="t-d2 gc-1-7" id="nl-h">Have a question worth exploring?</h2>
          <div className="nl-copy gc-8-12">
            <p className="lead">I write about designing and building digital products. If there’s a topic you’d like me to unpack, send it my way.</p>
            <p>
              <a className="btn btn-ink" href={`mailto:${EMAIL}?subject=${encodeURIComponent('Blog topic suggestion')}`} data-cursor="link">Suggest a topic<Arrow /></a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

