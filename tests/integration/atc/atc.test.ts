/**
 * KATA Architecture - ATC API (Integration)
 *
 * Create -> update -> search lifecycle of an ATC over the API. One chained test
 * on purpose: the ATC API has no GET-by-id and no DELETE, so the update needs
 * the {id, version} the create returned, and the search proves the edit is
 * indexed. Titles are unique per run (faker) because created ATCs are never
 * removed from staging.
 *
 * The project/module/user-story/AC the ATC attaches to is an existing hierarchy
 * from `config.atcTarget` (env-driven), not hardcoded here.
 *
 * Tagged @regression, deliberately NOT @critical: it writes data to staging.
 */

import type { AtcCreateRequest, AtcUpdateRequest } from '@api/AtcApi';

import { faker } from '@faker-js/faker';
import { config, expect, test } from '@TestFixture';

test.describe('BK ATC API lifecycle', { tag: ['@regression'] }, () => {
  test('BK-149 / BK-156 / BK-1090: should create, update and find an ATC', async ({ api }) => {
    const target = config.atcTarget;
    const unique = faker.string.alphanumeric({ length: 10, casing: 'lower' });

    const createBody: AtcCreateRequest = {
      title: `Regression create ${unique}`,
      module_id: target.moduleId,
      user_story_id: target.userStoryId,
      acceptance_criterion_ids: [target.acceptanceCriterionId],
      layer: 'API',
      steps: [
        { position: 1, content: faker.lorem.sentence() },
        { position: 2, content: faker.lorem.sentence() },
      ],
      assertions: [{ content: faker.lorem.sentence() }],
    };
    const [, created] = await api.atc.createAtc(createBody);

    const updatedUnique = faker.string.alphanumeric({ length: 10, casing: 'lower' });
    const updateBody: AtcUpdateRequest = {
      title: `Regression update ${updatedUnique}`,
      acceptance_criterion_ids: [target.acceptanceCriterionId],
      layer: 'API',
      steps: [{ position: 1, content: faker.lorem.sentence() }],
      assertions: [{ content: faker.lorem.sentence() }],
    };
    const [, updated] = await api.atc.updateAtc(created.atc, updateBody);

    const [, search] = await api.atc.searchAtcs({
      query: updatedUnique,
      project_id: target.projectId,
    });
    expect(search.items.map(item => item.id)).toContain(updated.atc.id);
  });
});
