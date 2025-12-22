import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';

export const appMetaTags = (title?: string) => {
  const description =
    'GitLaw is an innovative platform offering free access to an extensive repository of legal contract templates. Powered by AI, our smart editor simplifies and clarifies legal documents, while our secure private repository allows you to store and manage your contracts effortlessly. Discover the future of legal documentation with GitLaw.';

  return [
    {
      title: title ? `${title} - GitLaw` : 'GitLaw',
    },
    {
      name: 'description',
      content: description,
    },
    {
      name: 'keywords',
      content:
        'GitLaw, legal documents, document signing, contracts, e-signing, legal tech, AI legal, contract templates',
    },
    {
      name: 'author',
      content: 'GitLaw',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      property: 'og:title',
      content: 'GitLaw',
    },
    {
      property: 'og:description',
      content: description,
    },
    {
      property: 'og:image',
      content: `${NEXT_PUBLIC_WEBAPP_URL()}/opengraph-image.jpg`,
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:site',
      content: '@gitlaw',
    },
    {
      name: 'twitter:description',
      content: description,
    },
    {
      name: 'twitter:image',
      content: `${NEXT_PUBLIC_WEBAPP_URL()}/opengraph-image.jpg`,
    },
  ];
};
