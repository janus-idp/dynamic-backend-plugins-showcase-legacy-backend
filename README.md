# Dynamic backend plugins showcase - Legacy backend support

## Description

This repository is a complement to the main [Dynamic backend plugins showcase](https://github.com/janus-idp/dynamic-backend-plugins-showcase) to provide an additional application that can be used to test the dynamic backend plugins feature with the legacy backend system.

The experimental dynamic backend plugins feature provided by the new [backend-plugin-manager](https://github.com/davidfestal/backstage/tree/new-backend-plugin-manager/packages/backend-plugin-manager) package introduced in **PR [#18862](https://github.com/backstage/backstage/pull/18862)** according to Backstage **RFC [#18390](https://github.com/backstage/backstage/issues/18390)**, is mainly targeted to the new backend system.

However, it is also possible to test it with the legacy backend system, bu using the legacy backend application provided in this repository.

## Usage

### Prerequisites

- You should at the root of your backstage reporitory.

- The content of the [`dynamic-backend-plugins-showcase`](https://github.com/janus-idp/dynamic-backend-plugins-showcase) GitHub repository should be copied into a `dynamic-backend-plugins-showcase` folder at the root of your backstage repository, by running the following command in the root of your backstage repository:

  ```bash
  mkdir -p dynamic-backend-plugins-showcase
  curl  https://github.com/janus-idp/dynamic-backend-plugins-showcase/archive/main.tar.gz | tar -xz -C dynamic-backend-plugins-showcase --strip-components=1
  ```

- Copy the dynamic-plugin-enabled backstage frontend application package to the backstage application:

  ```bash
  cp -R dynamic-backend-plugins-showcase/apps/app-for-dynamic packages
  ```

  _NOTE: The `app-for-dynamic` package contains no change related to dynamic backend plugin support. It is provided only for the purpose of containing the same minimal list of plugins as the dynamic-plugin-enaled backend applications, in order to make testing easier_

- Copy the `backend-for-dynamic` folder of this [`dynamic-backend-plugins-showcase-legacy-backend`](https://github.com/janus-idp/dynamic-backend-plugins-showcase-legacy-backend) repository into the `packages` folder at the root of your backstage repository, by running the following command in the root of your backstage repository:

  ```bash
  mkdir -p packages/backend-for-dynamic
  curl -s -L https://github.com/janus-idp/dynamic-backend-plugins-showcase-legacy-backend/archive/main.tar.gz | tar -xz -C packages/backend-for-dynamic --strip-components=2
  ```

- Install the dependencies of the dynamic plugin enabled backstage application packages:

  ```bash
  yarn install
  ```

### In development mode

Follow the instructions [in the main showcase](https://github.com/janus-idp/dynamic-backend-plugins-showcase#in-development-mode), but replace `backend-next-for-dynamic` by `backend-for-dynamic` in the commands.

### In production mode

Follow the instructions [in the main showcase](https://github.com/janus-idp/dynamic-backend-plugins-showcase#in-production-mode), but replace `backend-next-for-dynamic` by `backend-for-dynamic` in the commands.
