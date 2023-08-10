/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { CatalogClient } from '@backstage/catalog-client';
import {
  createBuiltinActions,
  createRouter,
} from '@backstage/plugin-scaffolder-backend';
import { ScmIntegrations } from '@backstage/integration';
import { Router } from 'express';
import {
  LegacyBackendPluginInstaller,
  PluginEnvironment,
} from '@backstage/backend-plugin-manager';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const catalogClient = new CatalogClient({
    discoveryApi: env.discovery,
  });

  const integrations = ScmIntegrations.fromConfig(env.config);

  const builtInActions = createBuiltinActions({
    integrations,
    config: env.config,
    catalogClient,
    reader: env.reader,
  });

  const actions = [
    ...builtInActions,
    ...env.pluginProvider
      .backendPlugins()
      .map(p => p.installer)
      .filter((i): i is LegacyBackendPluginInstaller => i.kind === 'legacy')
      .flatMap(({ scaffolder }) => {
        if (scaffolder) {
          return scaffolder(env);
        }
        return [];
      }),
  ];

  return await createRouter({
    logger: env.logger,
    config: env.config,
    database: env.database,
    reader: env.reader,
    catalogClient: catalogClient,
    identity: env.identity,
    scheduler: env.scheduler,
    permissions: env.permissions,
    actions,
  });
}
