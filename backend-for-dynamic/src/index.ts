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

import Router from 'express-promise-router';
import {
  createServiceBuilder,
  loadBackendConfig,
  getRootLogger,
  useHotMemoize,
  notFoundHandler,
  CacheManager,
  DatabaseManager,
  HostDiscovery,
  UrlReaders,
  ServerTokenManager,
} from '@backstage/backend-common';
import { TaskScheduler } from '@backstage/backend-tasks';
import { Config } from '@backstage/config';
import app from './plugins/app';
import auth from './plugins/auth';
import catalog from './plugins/catalog';
import events from './plugins/events';
import permission, { AllowAllPermissionPolicy } from './plugins/permission';
import scaffolder from './plugins/scaffolder';
import proxy from './plugins/proxy';
import techdocs from './plugins/techdocs';
import search from './plugins/search';
import { ServerPermissionClient } from '@backstage/plugin-permission-node';
import { DefaultIdentityClient } from '@backstage/plugin-auth-node';
import {
  PluginManager,
  BackendPluginProvider,
  PluginEnvironment,
} from '@backstage/backend-plugin-manager';
import { DefaultEventBroker } from '@backstage/plugin-events-backend';

function makeCreateEnv(config: Config, pluginProvider: BackendPluginProvider) {
  const root = getRootLogger();
  const reader = UrlReaders.default({ logger: root, config });
  const discovery = HostDiscovery.fromConfig(config);
  const tokenManager = ServerTokenManager.fromConfig(config, { logger: root });
  const permissions = ServerPermissionClient.fromConfig(config, {
    discovery,
    tokenManager,
  });
  const databaseManager = DatabaseManager.fromConfig(config, { logger: root });
  const cacheManager = CacheManager.fromConfig(config);
  const taskScheduler = TaskScheduler.fromConfig(config);
  const identity = DefaultIdentityClient.create({
    discovery,
  });

  const eventBroker = new DefaultEventBroker(root.child({ type: 'plugin' }));

  root.info(`Created UrlReader ${reader}`);

  return (plugin: string): PluginEnvironment => {
    const logger = root.child({ type: 'plugin', plugin });
    const database = databaseManager.forPlugin(plugin);
    const cache = cacheManager.forPlugin(plugin);
    const scheduler = taskScheduler.forPlugin(plugin);
    return {
      logger,
      database,
      cache,
      config,
      reader,
      eventBroker,
      discovery,
      tokenManager,
      permissions,
      scheduler,
      identity,
      pluginProvider,
    };
  };
}

async function main() {
  const logger = getRootLogger();
  const config = await loadBackendConfig({
    argv: process.argv,
    logger: logger,
  });
  const pluginManager = await PluginManager.fromConfig(config, logger);
  if (
    !pluginManager
      .backendPlugins()
      .some(
        p => p.installer.kind === 'legacy' && p.installer.permissions?.policy,
      )
  ) {
    pluginManager.addBackendPlugin({
      name: 'embedded',
      version: 'embedded',
      platform: 'node',
      role: 'backend-plugin-module',
      installer: {
        kind: 'legacy',
        permissions: {
          policy: new AllowAllPermissionPolicy(),
        },
      },
    });
  }

  const createEnv = makeCreateEnv(config, pluginManager);

  const permissionEnv = useHotMemoize(module, () => createEnv('permission'));
  const catalogEnv = useHotMemoize(module, () => createEnv('catalog'));
  const scaffolderEnv = useHotMemoize(module, () => createEnv('scaffolder'));
  const authEnv = useHotMemoize(module, () => createEnv('auth'));
  const proxyEnv = useHotMemoize(module, () => createEnv('proxy'));
  const techdocsEnv = useHotMemoize(module, () => createEnv('techdocs'));
  const searchEnv = useHotMemoize(module, () => createEnv('search'));
  const appEnv = useHotMemoize(module, () => createEnv('app'));
  const eventsEnv = useHotMemoize(module, () => createEnv('events'));

  const apiRouter = Router();
  apiRouter.use('/permission', await permission(permissionEnv));
  apiRouter.use('/catalog', await catalog(catalogEnv));
  apiRouter.use('/events', await events(eventsEnv));
  apiRouter.use('/scaffolder', await scaffolder(scaffolderEnv));
  apiRouter.use('/auth', await auth(authEnv));
  apiRouter.use('/techdocs', await techdocs(techdocsEnv));
  apiRouter.use('/proxy', await proxy(proxyEnv));
  apiRouter.use('/search', await search(searchEnv));

  for (const plugin of pluginManager.backendPlugins()) {
    if (plugin.installer.kind === 'legacy') {
      const pluginRouter = plugin.installer.router;
      if (pluginRouter !== undefined) {
        const pluginEnv = useHotMemoize(module, () =>
          createEnv(pluginRouter.pluginID),
        );
        apiRouter.use(
          `/${pluginRouter.pluginID}`,
          await pluginRouter.createPlugin(pluginEnv),
        );
      }
    }
  }

  // Add backends ABOVE this line; this 404 handler is the catch-all fallback
  apiRouter.use(notFoundHandler());

  const service = createServiceBuilder(module)
    .loadConfig(config)
    .addRouter('/api', apiRouter)
    .addRouter('', await app(appEnv));

  await service.start().catch(err => {
    console.log(err);
    process.exit(1);
  });
}

module.hot?.accept();
main().catch(error => {
  console.error('Backend failed to start up', error);
  process.exit(1);
});
